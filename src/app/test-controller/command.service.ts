import { Inject, Injectable, OnDestroy } from '@angular/core';
import {
  of, Subject, Subscription, timer
} from 'rxjs';
import {
  concatMap,
  distinctUntilChanged,
  filter,
  ignoreElements,
  map,
  mergeMap,
  startWith,
  switchMap, tap
} from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import {
  Command, commandKeywords, isKnownCommand, TestControllerState
} from './test-controller.interfaces';
import { TestControllerService } from './test-controller.service';
import { WebsocketBackendService } from '../shared/websocket-backend.service';

type TestStartedOrStopped = 'started' | 'terminated' | '';

@Injectable({
  providedIn: 'root'
})
export class CommandService extends WebsocketBackendService<Command[]> implements OnDestroy {
  public command$: Subject<Command> = new Subject<Command>();

  protected initialData = [];
  protected pollingEndpoint = '';
  protected pollingInterval = 5000;
  protected wsChannelName = 'commands';

  private commandReceived$: Subject<Command> = new Subject<Command>();
  private commandSubscription: Subscription;
  private testStartedSubscription: Subscription;
  private executedCommandIds: number[] = [];

  constructor(
    @Inject('IS_PRODUCTION_MODE') public isProductionMode: boolean,
    private tcs: TestControllerService,
    @Inject('SERVER_URL') serverUrl: string,
    protected http: HttpClient
  ) {
    super(serverUrl, http);

    if (!this.isProductionMode) {
      this.setUpGlobalCommandsForDebug();
    }

    // as services don't have a OnInit Hook (see: https://v9.angular.io/api/core/OnInit) we subscribe here
    this.subscribeReceivedCommands();
    this.subscribeTestStarted();
  }

  private static commandToString(command: Command): string {
    return `[${command.id}] ${command.keyword} ${command.arguments.join(' ')}`;
  }

  private static testStartedOrStopped(testStatus: TestControllerState): TestStartedOrStopped {
    if ((testStatus === TestControllerState.RUNNING) || (testStatus === TestControllerState.PAUSED)) {
      return 'started';
    }
    if ((testStatus === TestControllerState.FINISHED) || (testStatus === TestControllerState.ERROR)) {
      return 'terminated';
    }
    return '';
  }

  // services are normally meant to live forever, so unsubscription *should* be unnecessary
  // this unsubscriptions are only for the case, the project's architecture will be changed dramatically once
  // while not having a OnInit-hook services *do have* an OnDestroy-hook (see: https://v9.angular.io/api/core/OnDestroy)
  ngOnDestroy(): void {
    this.commandSubscription.unsubscribe();
    this.testStartedSubscription.unsubscribe();
  }

  private subscribeReceivedCommands() {
    this.commandReceived$
      .pipe(
        filter((command: Command) => (this.executedCommandIds.indexOf(command.id) < 0)),
        // min delay between items
        concatMap((command: Command) => timer(1000).pipe(ignoreElements(), startWith(command))),
        mergeMap((command: Command) => {
          console.log(`try to execute ${CommandService.commandToString(command)}`);
          return this.http.patch(`${this.serverUrl}test/${this.tcs.testId}/command/${command.id}/executed`, {})
            .pipe(
              map(() => command),
              tap(cmd => this.executedCommandIds.push(cmd.id))
            );
        })
      ).subscribe(command => this.command$.next(command));
  }

  private subscribeTestStarted() {
    if (typeof this.testStartedSubscription !== 'undefined') {
      this.testStartedSubscription.unsubscribe();
    }

    this.testStartedSubscription = this.tcs.testStatus$
      .pipe(
        distinctUntilChanged(),
        map(CommandService.testStartedOrStopped),
        filter(testStartedOrStopped => testStartedOrStopped !== ''),
        map(testStartedOrStopped => ((testStartedOrStopped === 'started') ? `test/${this.tcs.testId}/commands` : '')),
        filter(newPollingEndpoint => newPollingEndpoint !== this.pollingEndpoint),
        switchMap((pollingEndpoint: string) => {
          this.pollingEndpoint = pollingEndpoint;
          if (this.pollingEndpoint) {
            return this.observeEndpointAndChannel();
          }
          this.cutConnection();
          return of([]);
        }),
        switchMap(commands => of(...commands))
      ).subscribe(this.commandReceived$);
  }

  private setUpGlobalCommandsForDebug() {
    // eslint-disable-next-line @typescript-eslint/dot-notation
    window['tc'] = {};
    commandKeywords.forEach((keyword: string) => {
      // eslint-disable-next-line @typescript-eslint/dot-notation
      window['tc'][keyword] = args => { this.commandFromTerminal(keyword, args); };
    });
  }

  private commandFromTerminal(keyword: string, args: string[]): void {
    if (this.isProductionMode) {
      return;
    }
    // eslint-disable-next-line no-param-reassign
    args = (typeof args === 'undefined') ? [] : args;
    const id = Math.round(Math.random() * -10000000);
    const command = {
      keyword,
      arguments: args,
      id,
      timestamp: Date.now()
    };
    if (!isKnownCommand(keyword)) {
      console.warn(`Unknown command: ${CommandService.commandToString(command)}`);
      return;
    }
    this.command$.next(command);
  }
}
