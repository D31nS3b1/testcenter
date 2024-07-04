import {
  BehaviorSubject, combineLatest, merge, Subscription
} from 'rxjs';
import {
  Component, HostListener, OnInit, OnDestroy, ViewChild, ElementRef
} from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Testlet, LoadingProgress, isUnit } from '../../interfaces/test-controller.interfaces';
import { BackendService } from '../../services/backend.service';
import { TestControllerService } from '../../services/test-controller.service';
import { MainDataService } from '../../../shared/shared.module';
import {
  Verona5ValidPages,
  Verona6ValidPages,
  VeronaNavigationDeniedReason,
  VeronaNavigationTarget,
  VeronaPlayerConfig,
  VeronaPlayerRuntimeErrorCodes
} from '../../interfaces/verona.interfaces';
import { AppError } from '../../../app.interfaces';

@Component({
  templateUrl: './unithost.component.html',
  styleUrls: ['./unithost.component.css']
})

export class UnithostComponent implements OnInit, OnDestroy {
  @ViewChild('iframeHost') private iFrameHostElement!: ElementRef;
  private iFrameItemplayer: HTMLIFrameElement | null = null;
  private subscriptions: { [tag: string ]: Subscription } = {};
  leaveWarning = false;

  private playerSessionId = '';
  private postMessageTarget: Window = window;

  resourcesLoading$: BehaviorSubject<LoadingProgress[]> = new BehaviorSubject<LoadingProgress[]>([]);
  resourcesToLoadLabels: string[] = [];

  pages: { [id: string]: string } = {};
  pageLabels: string[] = [];
  currentPageIndex: number = -1;

  clearCode: string = '';

  constructor(
    public tcs: TestControllerService,
    private mds: MainDataService,
    private bs: BackendService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.iFrameItemplayer = null;
    this.leaveWarning = false;
    setTimeout(() => {
      this.subscriptions.postMessage = this.mds.postMessage$
        .subscribe(messageEvent => this.handleIncomingMessage(messageEvent));
      this.subscriptions.routing = merge(this.route.queryParamMap, this.route.params)
        .subscribe((params: Params) => (params.u ? this.open(Number(<Params>params.u)) : this.reload()));
      this.subscriptions.navigationDenial = this.tcs.navigationDenial$
        .subscribe(navigationDenial => this.handleNavigationDenial(navigationDenial));
      this.subscriptions.testStructureChanges = this.tcs.testStructureChanges$
        .subscribe(() => this.updatePlayerConfig());
    });
  }

  ngOnDestroy(): void {
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
  }

  private async handleIncomingMessage(messageEvent: MessageEvent): Promise<void> {
    if (!this.tcs.currentUnit) {
      return;
    }
    const msgData = messageEvent.data;
    const msgType = msgData.type;
    let msgSessionId = msgData.sessionId;
    if ((msgSessionId === undefined) || (msgSessionId === null)) {
      msgSessionId = this.playerSessionId;
    }
    this.postMessageTarget = messageEvent.source as Window;
    if (msgData.sessionId && (msgSessionId !== this.playerSessionId)) {
      // eslint-disable-next-line no-console
      console.warn('wrong player session id: ', msgData.sessionId, msgData);
      return;
    }

    switch (msgType) {
      case 'vopReadyNotification':
        await this.handleReadyNotification(msgData);
        break;

      case 'vopStateChangedNotification':
        this.handleStateChangedNotification(msgData);
        break;

      case 'vopUnitNavigationRequestedNotification':
        this.handleUnitNavigationRequestedNotification(msgData);
        break;

      case 'vopWindowFocusChangedNotification':
        this.handleWindowFocusChangedNotification(msgData);
        break;

      case 'vopRuntimeErrorNotification':
        this.handleRuntimeError(msgData.code, msgData.message);
        if (this.tcs.testMode.saveResponses) {
          this.bs.addUnitLog(
            this.tcs.testId,
            this.tcs.currentUnit.alias,
            [
              {
                key: `Runtime Error: ${msgData.code}`,
                content: msgData.message || '',
                timeStamp: Date.now()
              }
            ]
          );
        }
        break;

      default:
        // eslint-disable-next-line no-console
        console.log(`processMessagePost ignored message: ${msgType}`);
        break;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleReadyNotification(msgData: any): Promise<void> {
    // eslint-disable-next-line no-case-declarations
    const playerApiVersion = msgData.apiVersion || msgData.metadata.specVersion;
    // eslint-disable-next-line no-case-declarations
    const playerApiVersionMajor = parseInt(playerApiVersion.split('.').shift() ?? '', 10);

    if (
      this.mds.appConfig && (
        playerApiVersionMajor < this.mds.appConfig.veronaPlayerApiVersionMin ||
        playerApiVersionMajor > this.mds.appConfig.veronaPlayerApiVersionMax
      )
    ) {
      throw new AppError({
        description: `Player uses Verona ${playerApiVersion}, but this testcenter only support 
              ${this.mds.appConfig.veronaPlayerApiVersionMin} to ${this.mds.appConfig.veronaPlayerApiVersionMax}`,
        label: 'Unpassende Verona-Version',
        type: 'verona_player_runtime_error'
      });
    }

    this.tcs.updateUnitState(
      this.tcs.currentUnitSequenceId,
      {
        testId: this.tcs.testId,
        unitAlias: this.tcs.currentUnit.alias,
        state: [{
          key: 'PLAYER',
          timeStamp: Date.now(),
          content: 'RUNNING'
        }]
      }
    );

    this.postMessageTarget.postMessage({
      type: 'vopStartCommand',
      sessionId: this.playerSessionId,
      unitDefinition: this.tcs.currentUnit.definition,
      unitDefinitionType: this.tcs.currentUnit.unitDefinitionType,
      unitState: {
        ...this.tcs.currentUnit.state,
        dataParts: this.tcs.currentUnit.dataParts
      },
      playerConfig: await this.getPlayerConfig()
    }, '*');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleStateChangedNotification(msgData: any): void {
    if (msgData.playerState) {
      const { playerState } = msgData;

      this.readPages(playerState.validPages);
      this.currentPageIndex = Object.keys(this.pages).indexOf(playerState.currentPage);

      if (typeof playerState.currentPage !== 'undefined') {
        const pageId = playerState.currentPage;
        const pageNr = Object.keys(this.pages)[pageId] + 1; // only for humans to read in the logs
        const pageCount = Object.keys(this.pages).length;
        if (Object.keys(this.pages).length > 1 && this.pages[playerState.currentPage]) {
          this.tcs.updateUnitState(
            this.tcs.currentUnitSequenceId,
            {
              testId: this.tcs.testId,
              unitAlias: this.tcs.currentUnit.alias,
              state: [
                { key: 'CURRENT_PAGE_NR', timeStamp: Date.now(), content: pageNr.toString() },
                { key: 'CURRENT_PAGE_ID', timeStamp: Date.now(), content: pageId },
                { key: 'PAGE_COUNT', timeStamp: Date.now(), content: pageCount.toString() }
              ]
            }
          );
        }
      }
    }
    if (msgData.unitState) {
      const { unitState } = msgData;
      const timeStamp = Date.now();

      this.tcs.updateUnitState(
        this.tcs.currentUnitSequenceId,
        {
          testId: this.tcs.testId,
          unitAlias: this.tcs.currentUnit.alias,
          state: [
            { key: 'PRESENTATION_PROGRESS', timeStamp, content: unitState.presentationProgress },
            { key: 'RESPONSE_PROGRESS', timeStamp, content: unitState.responseProgress }
          ]
        }
      );

      if (unitState?.dataParts) {
        // in pre-verona4-times it was not entirely clear if the stringification of the dataParts should be made
        // by the player itself ot the host. To maintain backwards-compatibility we check this here.
        Object.keys(unitState.dataParts)
          .forEach(dataPartId => {
            if (typeof unitState.dataParts[dataPartId] !== 'string') {
              unitState.dataParts[dataPartId] = JSON.stringify(unitState.dataParts[dataPartId]);
            }
          });
        this.tcs.updateUnitStateDataParts(
          this.tcs.currentUnit.alias,
          unitState.dataParts,
          unitState.unitStateDataType
        );
      }
    }
    if (msgData.log) {
      this.bs.addUnitLog(this.tcs.testId, this.tcs.currentUnit.alias, msgData.log);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleUnitNavigationRequestedNotification(msgData: any): void {
    // support Verona2 and Verona3 version
    const target = msgData.target ? `#${msgData.target}` : msgData.targetRelative;
    this.tcs.setUnitNavigationRequest(target);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleWindowFocusChangedNotification(msgData: any): void {
    if (msgData.hasFocus) {
      this.tcs.windowFocusState$.next('PLAYER');
    } else if (document.hasFocus()) {
      this.tcs.windowFocusState$.next('HOST');
    } else {
      this.tcs.windowFocusState$.next('UNKNOWN');
    }
  }

  private readPages(validPages: Verona5ValidPages | Verona6ValidPages): void {
    this.pages = { };
    if (!Array.isArray(validPages)) {
      // Verona 2-5
      this.pages = validPages;
    } else {
      // Verona > 6
      // covers also some versions of aspect who send a corrupted format
      validPages
        .forEach((page, index) => {
          this.pages[String(page.id ?? index)] = page.label ?? String(index + 1);
        });
    }
    this.pageLabels = Object.values(this.pages);
  }

  private handleRuntimeError(code?: string, message?: string): void {
    // possible reactions on runtimeErrors
    const reactions: { [key: string]: (code: string, message: string) => void } = {
      raiseError: (errorCode, errorMessage) => {
        throw new AppError({
          label: 'Fehler beim Abspielen der Aufgabe',
          description: errorMessage,
          type: 'verona_player_runtime_error',
          code: VeronaPlayerRuntimeErrorCodes.indexOf(errorCode)
        });
      },
      removeTryLeaveRestrictions: () => {
        // this might be the correct reaction on unloadable audio or what
        this.tcs.currentUnit.state.RESPONSE_PROGRESS = 'complete';
        this.tcs.currentUnit.state.PRESENTATION_PROGRESS = 'complete';
      }
    };
    const runTimeErrorReactionMap:
    { [code in typeof VeronaPlayerRuntimeErrorCodes[number]] : keyof typeof reactions } = {
      'session-id-missing': 'raiseError',
      'unit-definition-missing': 'raiseError',
      'wrong-session-id': 'raiseError',
      'unit-definition-type-unsupported': 'raiseError',
      'unit-state-type-unsupported': 'raiseError',
      'runtime-error': 'raiseError'
    };
    reactions[runTimeErrorReactionMap[code || 'runtime-error'] || 'raiseError'](code || '', message || '');
  }

  private open(unitSequenceId: number): void {
    this.tcs.currentUnitSequenceId = unitSequenceId;

    while (this.iFrameHostElement.nativeElement.hasChildNodes()) {
      this.iFrameHostElement.nativeElement.removeChild(this.iFrameHostElement.nativeElement.lastChild);
    }

    this.currentPageIndex = -1;
    this.pages = {};
    this.pageLabels = [];

    this.mds.appSubTitle$.next(this.tcs.currentUnit.label);

    if (this.subscriptions.loading) {
      this.subscriptions.loading.unsubscribe();
    }

    let unitsToLoadIds: number[] = [];
    const addChildren = (testlet: Testlet) => {
      testlet.children.forEach(child => {
        if (isUnit(child)) {
          unitsToLoadIds.push(child.sequenceId);
        } else {
          addChildren(child);
        }
      });
    };
    if (this.tcs.currentUnit.parent) {
      addChildren(this.tcs.currentUnit.parent);
    } else {
      unitsToLoadIds = [this.tcs.currentUnitSequenceId];
    }

    const resourcesToLoad = unitsToLoadIds
      .flatMap(sequenceId => Object.values(this.tcs.getUnit(sequenceId).loadingProgress));

    this.resourcesToLoadLabels = unitsToLoadIds
      .flatMap(sequenceId => Object.keys(this.tcs.getUnit(sequenceId).loadingProgress)
        .map(key => `${this.tcs.getUnit(sequenceId).label} (${key})`)
      );

    this.subscriptions.loading = combineLatest<LoadingProgress[]>(resourcesToLoad)
      .subscribe({
        next: value => {
          this.resourcesLoading$.next(value);
        },
        error: err => {
          this.mds.appError = new AppError({
            label: `Unit konnte nicht geladen werden. ${err.info}`,
            description: (err.info) ? err.info : err,
            type: 'network'
          });
        },
        complete: () => this.prepareUnit()
      });
  }

  private prepareUnit(): void {
    if (!this.tcs.currentUnit) {
      throw new Error('Unit not loaded');
    }
    this.resourcesLoading$.next([]);

    this.tcs.setTestState('CURRENT_UNIT_ID', this.tcs.currentUnit.alias);
    if (this.tcs.testMode.saveResponses) {
      this.tcs.updateUnitState(
        this.tcs.currentUnitSequenceId,
        {
          testId: this.tcs.testId,
          unitAlias: this.tcs.currentUnit.alias,
          state: [{ key: 'PLAYER', timeStamp: Date.now(), content: 'LOADING' }]
        }
      );
    }

    if (this.tcs.testMode.presetCode) {
      this.clearCode = this.tcs.currentUnit.parent.restrictions.codeToEnter?.code || '';
    }

    // if (this.tcs.testMode.canChoosePathManually) {
    //   this.tsc.unlock
    // }

    this.runUnit();
  }

  private runUnit(): void {
    if (this.tcs.currentUnit.parent.locked) {
      return;
    }

    this.startTimerIfNecessary();
    this.playerSessionId = Math.floor(Math.random() * 20000000 + 10000000).toString();
    this.leaveWarning = false;
    this.prepareIframe();
  }

  private startTimerIfNecessary(): void {
    if (!this.tcs.currentUnit?.parent.timerId) {
      return;
    }
    if (this.tcs.currentTimerId &&
      (this.tcs.currentUnit.parent.timerId === this.tcs.currentTimerId)
    ) {
      return;
    }
    this.tcs.startTimer(this.tcs.testlets[this.tcs.currentUnit.parent.timerId]);
  }

  private prepareIframe(): void {
    if (!this.tcs.currentUnit) {
      return;
    }
    this.iFrameItemplayer = <HTMLIFrameElement>document.createElement('iframe');
    if (!('srcdoc' in this.iFrameItemplayer)) {
      this.mds.appError = new AppError({
        label: 'Veralteter Browser',
        description: 'Ihr browser is veraltet oder inkompatibel mit dieser Anwendung!',
        type: 'general'
      });
      return;
    }
    this.iFrameItemplayer.setAttribute('class', 'unitHost');
    this.adjustIframeSize();
    this.iFrameHostElement.nativeElement.appendChild(this.iFrameItemplayer);
    this.iFrameItemplayer.setAttribute('srcdoc', this.tcs.getPlayer(this.tcs.currentUnit.playerFileName));
  }

  private adjustIframeSize(): void {
    this.iFrameItemplayer?.setAttribute('height', String(this.iFrameHostElement.nativeElement.clientHeight));
  }

  private reload(): void {
    if (!this.tcs.currentUnitSequenceId || !this.tcs.currentUnit) {
      return;
    }
    this.open(this.tcs.currentUnitSequenceId);
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.iFrameItemplayer && this.iFrameHostElement) {
      this.adjustIframeSize();
    }
  }

  private async getPlayerConfig(): Promise<VeronaPlayerConfig> {
    if (!this.tcs.currentUnit) {
      throw new Error('Unit not loaded');
    }
    const groupToken = this.mds.getAuthData()?.groupToken;
    const resourceUri = this.mds.appConfig?.fileServiceUri ?? this.bs.backendUrl;
    const playerConfig: VeronaPlayerConfig = {
      enabledNavigationTargets: UnithostComponent.getEnabledNavigationTargets(
        this.tcs.currentUnitSequenceId,
        await this.tcs.getSequenceBounds(),
        this.tcs.bookletConfig.allow_player_to_terminate_test
      ),
      logPolicy: this.tcs.bookletConfig.logPolicy,
      pagingMode: this.tcs.bookletConfig.pagingMode,
      unitNumber: this.tcs.currentUnitSequenceId,
      unitTitle: this.tcs.currentUnit.label,
      unitId: this.tcs.currentUnit.alias,
      stateReportPolicy: 'eager', // for pre-verona-4-players which does not report by default
      directDownloadUrl: `${resourceUri}file/${groupToken}/ws_${this.tcs.workspaceId}/Resource`
    };
    if (
      this.tcs.currentUnit.state.CURRENT_PAGE_ID &&
      (this.tcs.bookletConfig.restore_current_page_on_return === 'ON')
    ) {
      playerConfig.startPage = this.tcs.currentUnit.state.CURRENT_PAGE_ID;
    }
    return playerConfig;
  }

  private static getEnabledNavigationTargets(
    nr: number,
    bounds: [min: number, max: number],
    terminationAllowed: 'ON' | 'OFF' | 'LAST_UNIT' = 'ON'
  ): VeronaNavigationTarget[] {
    const navigationTargets: VeronaNavigationTarget[] = [];
    if (nr < bounds[1]) {
      navigationTargets.push('next');
    }
    if (nr > bounds[0]) {
      navigationTargets.push('previous');
    }
    if (nr !== bounds[0]) {
      navigationTargets.push('first');
    }
    if (nr !== bounds[1]) {
      navigationTargets.push('last');
    }
    if (terminationAllowed === 'ON') {
      navigationTargets.push('end');
    }
    if ((terminationAllowed === 'LAST_UNIT') && (nr === bounds[1])) {
      navigationTargets.push('end');
    }
    return navigationTargets;
  }

  gotoNextPage(): void {
    this.gotoPage(this.currentPageIndex + 1);
  }

  gotoPreviousPage(): void {
    this.gotoPage(this.currentPageIndex - 1);
  }

  gotoPage(targetPageIndex: number): void {
    this.postMessageTarget?.postMessage({
      type: 'vopPageNavigationCommand',
      sessionId: this.playerSessionId,
      target: Object.keys(this.pages)[targetPageIndex]
    }, '*');
  }

  private handleNavigationDenial(
    navigationDenial: { sourceUnitSequenceId: number; reason: VeronaNavigationDeniedReason[] }
  ): void {
    if (navigationDenial.sourceUnitSequenceId !== this.tcs.currentUnitSequenceId) {
      return;
    }

    this.postMessageTarget.postMessage({
      type: 'vopNavigationDeniedNotification',
      sessionId: this.playerSessionId,
      reason: navigationDenial.reason
    }, '*');
  }

  verifyCodes(): void {
    if (!this.tcs.currentUnit || (!this.tcs.currentUnit.parent.locked)) {
      throw new Error('Unit not loaded');
    }

    const requiredCode =
      (this.tcs.currentUnit.parent.locked.through.restrictions?.codeToEnter?.code || '').toUpperCase().trim();
    const givenCode = this.clearCode.toUpperCase().trim();

    if (requiredCode === givenCode) {
      this.tcs.clearTestlet(this.tcs.currentUnit.parent.locked.through.id);
      this.runUnit();
    } else {
      this.snackBar.open(
        `Freigabewort '${givenCode}' für '${this.tcs.currentUnit.parent.locked.through.label}' stimmt nicht.`,
        'OK',
        { duration: 3000 }
      );
    }
    this.clearCode = '';
  }

  onKeydownInClearCodeInput($event: KeyboardEvent): void {
    if ($event.key === 'Enter') {
      this.verifyCodes();
    }
  }

  private async updatePlayerConfig() {
    this.postMessageTarget.postMessage({
      type: 'vopPlayerConfigChangedNotification',
      sessionId: this.playerSessionId,
      playerConfig: await this.getPlayerConfig()
    }, '*');
  }
}
