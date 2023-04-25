import { Injectable } from '@angular/core';
import {
  BehaviorSubject, Observable, ReplaySubject, Subject
} from 'rxjs';
import { CustomtextService } from '../customtext/customtext.service';
import {
  AccessObject, AppError, AuthAccessType, AuthData
} from '../../../app.interfaces';
import { AppConfig } from '../../classes/app.config';

const localStorageAuthDataKey = 'iqb-tc-a';

@Injectable({
  providedIn: 'root'
})
export class MainDataService {
  appError$ = new ReplaySubject<AppError>(1);
  private _authData$ = new BehaviorSubject<AuthData | null>(null);
  get authData$(): Observable<AuthData | null> {
    return this._authData$.asObservable();
  }

  spinnerOn = false;
  progressVisualEnabled = true;
  appConfig: AppConfig = null;
  sysCheckAvailable = false;
  appTitle$ = new BehaviorSubject<string>('IQB-Testcenter');
  appSubTitle$ = new BehaviorSubject<string>('');
  globalWarning = '';

  postMessage$ = new Subject<MessageEvent>();
  appWindowHasFocus$ = new Subject<boolean>();

  getAuthData(): AuthData {
    if (this._authData$.getValue()) {
      return this._authData$.getValue();
    }
    try {
      return JSON.parse(localStorage.getItem(localStorageAuthDataKey));
    } catch (e) {
      return null;
    }
  }

  getAccessObject(type: AuthAccessType, id: string): AccessObject {
    return this.getAuthData().claims[type].find(accessObject => accessObject.id === id);
  }

  constructor(
    private cts: CustomtextService
  ) {
    this.appError$.subscribe(error => console.log({ error }));
  }

  showLoadingAnimation(): void {
    this.spinnerOn = true;
  }

  stopLoadingAnimation(): void {
    this.spinnerOn = false;
  }

  setAuthData(authData: AuthData = null): void {
    this._authData$.next(authData);
    if (authData) {
      if (authData.customTexts) {
        this.cts.addCustomTexts(authData.customTexts);
      }
      localStorage.setItem(localStorageAuthDataKey, JSON.stringify(authData));
    } else {
      this.cts.restoreDefault(true);
      localStorage.removeItem(localStorageAuthDataKey);
    }
  }

  resetAuthData(): void {
    const storageEntry = localStorage.getItem(localStorageAuthDataKey);
    if (storageEntry) {
      localStorage.removeItem(localStorageAuthDataKey);
    }
    this._authData$.next(this.getAuthData());
  }
  // TODO ! remove
  // setTestConfig(testConfig: KeyValuePairs = null): void {
  //   if (testConfig) {
  //     localStorage.setItem(localStorageTestConfigKey, JSON.stringify(testConfig));
  //   } else {
  //     localStorage.removeItem(localStorageTestConfigKey);
  //   }
  //   this._authData$.next(MainDataService.getAuthData());
  // }
}
