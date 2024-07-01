import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, Subscription } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import {
  UnitData, TestData, StateReportEntry, LoadingFile, KeyValuePairString, UnitStateUpdate, TestStateUpdate
} from '../interfaces/test-controller.interfaces';
import { MainDataService } from '../../shared/services/maindata/maindata.service';

@Injectable({
  providedIn: 'root'
})
export class BackendService {
  constructor(
    @Inject('BACKEND_URL') public backendUrl: string,
    private http: HttpClient,
    private mds: MainDataService
  ) {
  }

  saveReview(
    testId: string,
    unitAlias: string | null,
    priority: number,
    categories: string,
    entry: string
  ) : Observable<void> {
    return this.http.put<void>(
      `${this.backendUrl}test/${testId}${unitAlias ? `/unit/${unitAlias}` : ''}/review`,
      { priority, categories, entry }
    );
  }

  getTestData(testId: string): Observable<TestData> {
    return this.http.get<TestData>(`${this.backendUrl}test/${testId}`);
  }

  getUnitData(testId: string, unitid: string, unitalias: string): Observable<UnitData> {
    return this.http.get<UnitData>(`${this.backendUrl}test/${testId}/unit/${unitid}/alias/${unitalias}`);
  }

  patchTestState(patch: TestStateUpdate): Subscription {
    console.log('updateTestState', patch.testId, patch.state);

    return this.http.patch(`${this.backendUrl}test/${patch.testId}/state`, patch.state).subscribe();
  }

  addTestLog(testId: string, logEntries: StateReportEntry<string>[]): Subscription {
    return this.http.put(`${this.backendUrl}test/${testId}/log`, logEntries).subscribe();
  }

  patchUnitState(patch: UnitStateUpdate): Subscription {
    console.log(
      'updateUnitState',
      patch.state.map(entry => ([entry.key, entry.content]))
    );

    return this.http.patch(`${this.backendUrl}test/${patch.testId}/unit/${patch.unitAlias}/state`, patch.state)
      .subscribe();
  }

  addUnitLog(testId: string, unitName: string, logEntries: StateReportEntry<string>[]): Subscription {
    return this.http.put(`${this.backendUrl}test/${testId}/unit/${unitName}/log`, logEntries).subscribe();
  }

  notifyDyingTest(testId: string): void {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${this.backendUrl}test/${testId}/connection-lost`);
    } else {
      fetch(`${this.backendUrl}test/${testId}/connection-lost`, {
        keepalive: true,
        method: 'POST'
      });
    }
  }

  updateDataParts(testId: string, unitId: string, dataParts: KeyValuePairString, responseType: string): Subscription {
    const timeStamp = Date.now();
    return this.http
      .put(`${this.backendUrl}test/${testId}/unit/${unitId}/response`, { timeStamp, dataParts, responseType })
      .subscribe();
  }

  lockTest(testId: string, timeStamp: number, message: string): Subscription {
    return this.http
      .patch<boolean>(`${this.backendUrl}test/${testId}/lock`, { timeStamp, message })
      .subscribe();
  }

  getResource(workspaceId: number, path: string): Observable<LoadingFile> {
    const resourceUri = this.mds.appConfig?.fileServiceUri ?? this.backendUrl;
    return this.http
      .get(
        `${resourceUri}file/${this.mds.getAuthData()?.groupToken}/ws_${workspaceId}/${path}`,
        {
          responseType: 'text',
          reportProgress: true,
          observe: 'events'
        }
      )
      .pipe(
        map((event: HttpEvent<any>) => {
          switch (event.type) {
            case HttpEventType.ResponseHeader:
              return { progress: 0 };

            case HttpEventType.DownloadProgress:
              if (!event.total) { // happens if file is huge because browser switches to chunked loading
                return <LoadingFile>{ progress: 'UNKNOWN' };
              }
              return { progress: Math.round(100 * (event.loaded / event.total)) };

            case HttpEventType.Response:
              if (!event.body.length) {
                // this might happen when file is so large, that memory size get exhausted
                throw new Error(`Empty response for  '${path}'. Most likely the browsers memory was exhausted.`);
              }
              return { content: event.body };

            default:
              return null;
          }
        }),
        filter((progressOfContent): progressOfContent is LoadingFile => progressOfContent != null)
      );
  }
}
