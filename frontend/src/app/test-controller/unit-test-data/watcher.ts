import { Observable, Subject } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

export interface WatcherLogEntry {
  name: string,
  value: unknown,
  error?: string
}

/**
 * A helper to watch property-changes, functions calls, observables etc. on different object to test the correct order
 * of those events.
 *
 * Writing my's own watcher class might be a little bit naïve approach, but I did not find a way to test the correct
 * order of different types of events like property changes, observable events and promise resolving wie the
 * SpyOn-technique. This surely reflects the incoherence of the coding style in the whole test-controller module, which
 * I could not entirely wipe out by now. The module might one day be more slimlined and therefore more straightforward
 * to test.
 */
export class Watcher {
  readonly log$: Subject<WatcherLogEntry> = new Subject<WatcherLogEntry>();
  log: WatcherLogEntry[] = [];
  private watcherNames: string[] = [];

  private registerWatcher(watcherName: string): void {
    if (this.watcherNames.includes(watcherName)) {
      throw new Error(`Watcher ${watcherName} was already defined.`);
    }
    this.watcherNames.push(watcherName);
  }

  private addLog(entry: WatcherLogEntry): void {
    this.log.push(entry);
    this.log$.next(entry);
  }

  watchObservable(watcherName: string, observable: Observable<unknown>): void {
    this.registerWatcher(watcherName);
    observable
      .pipe(shareReplay())
      .subscribe({
        next: value => this.addLog({
          value,
          name: watcherName
        })
      });
  }

  watchProperty<T>(objectName: string, object: T, propertyName: keyof T): Observable<unknown> {
    const watcherName = `${String(objectName)}.${String(propertyName)}`.toString();
    this.registerWatcher(watcherName);
    const watch$ = new Subject();
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const propertyShadow = `__________${String(propertyName)}`;
    object[propertyShadow] = object[propertyName];
    Object.defineProperty(object, propertyName, {
      set(value) {
        self.addLog({ name: watcherName, value });
        watch$.next(value);
        this[propertyShadow] = value;
      },
      get() {
        return this[propertyShadow];
      }
    });
    return watch$;
  }

  watchMethod<T>(objectName: string, object: T, methodName: keyof T,
                 argumentsMapForLogger: { [argNr: number]: null | ((unknown) => unknown) } = {}
  ): Observable<unknown> {
    const watcherName = `${String(objectName)}.${String(methodName)}`;
    this.registerWatcher(watcherName);
    const watch$ = new Subject();
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const methodShadow = `__________${String(methodName)}`;
    object[methodShadow] = object[methodName];
    Object.defineProperty(object, methodName, {
      get() {
        return (...args) => {
          const mappedArguments = args
            .map((arg, argNr) => (argumentsMapForLogger[argNr] ? argumentsMapForLogger[argNr](arg) : arg))
            .filter((_, argNr) => argumentsMapForLogger[argNr] !== null);
          self.addLog({
            name: watcherName,
            value: mappedArguments
          });
          watch$.next(args);
          return object[methodShadow](...args);
        };
      }
    });
    return watch$;
  }

  watchPromise<T>(watcherName: string, promiseToWatch: Promise<T>): Promise<T> {
    this.registerWatcher(watcherName);
    return promiseToWatch
      .then(value => {
        this.addLog({ name: watcherName, value });
        return value;
      })
      .catch(
        (error: Error | string) => {
          const errMsg = error instanceof Error ? error.message : error;
          this.addLog({ name: watcherName, value: '', error: errMsg });
          throw error instanceof Error ? error : new Error(errMsg);
        }
      );
  }

  dump(): void {
    this.log.forEach(logEntry => {
      // eslint-disable-next-line no-console
      console.log(`{ name: '${logEntry.name}', value: ${JSON.stringify(logEntry.value)} }`);
      if (logEntry.error) {
        // eslint-disable-next-line no-console
        console.log('error: ', logEntry.error);
      }
    });
  }
}
