import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';


@Injectable()
export class BackendService {

  constructor(
    @Inject('SERVER_URL') private serverUrl: string,
    private http: HttpClient) {
      this.serverUrl = this.serverUrl + 'php_start/';
    }


  // BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
  login(name: string, password: string): Observable<string | ServerError> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };
    return this.http
      .post<string>(this.serverUrl + 'testlogin.php', {n: name, p: password}, httpOptions)
        .pipe(
          catchError(ErrorHandler.handle)
        );
  }

  // BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
  // don't use LoginData.code!
  getLoginDataByLoginToken(logintoken: string): Observable<LoginData | ServerError> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };
    return this.http
      .post<LoginData>(this.serverUrl + 'getLoginDataByLoginToken.php', {lt: logintoken}, httpOptions)
        .pipe(
          catchError(ErrorHandler.handle)
        );
  }

   // BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
   getLoginDataByPersonToken(persontoken: string): Observable<LoginData | ServerError> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };
    return this.http
      .post<LoginData>(this.serverUrl + 'getLoginDataByPersonToken.php', {pt: persontoken}, httpOptions)
        .pipe(
          catchError(ErrorHandler.handle)
        );
  }

  // BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
  getBookletStatusByNameAndPersonToken(persontoken: string, bookletname: string): Observable<BookletStatus | ServerError> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };
    return this.http
      .post<BookletStatus>(this.serverUrl + 'getBookletStatusByNameAndPersonToken.php', {
        pt: persontoken, b: bookletname}, httpOptions)
        .pipe(
          catchError(ErrorHandler.handle)
        );
  }

  // BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
  getBookletStatusByNameAndLoginToken(logintoken: string, code: string,
      bookletid: string, bookletlabel: string): Observable<BookletStatus | ServerError> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };
    return this.http
      .post<BookletStatus>(this.serverUrl + 'getBookletStatusByNameAndLoginToken.php', {
        lt: logintoken, b: bookletid, c: code, bl: bookletlabel}, httpOptions)
        .pipe(
          catchError(ErrorHandler.handle)
        );
  }

  // BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
  getBookletStatusByDbId(persontoken: string, bookletid: number): Observable<BookletStatus | ServerError> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };
    return this.http
      .post<BookletStatus>(this.serverUrl + 'getBookletStatusByDbId.php', {
        pt: persontoken, b: bookletid}, httpOptions)
        .pipe(
          catchError(ErrorHandler.handle)
        );
  }

  // BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
  startBookletByLoginToken(logintoken: string, code: string, bookletFilename: string): Observable<PersonTokenAndBookletId | ServerError> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };
    return this.http
      .post<PersonTokenAndBookletId>(this.serverUrl +
            'startBookletByLoginToken.php', {lt: logintoken, c: code, b: bookletFilename}, httpOptions)
        .pipe(
          catchError(ErrorHandler.handle)
        );
  }

  // BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
  // ??????????????????????? startBookletByPersonToken.php not available yet
  startBookletByPersonToken(persontoken: string, bookletFilename: string): Observable<number | ServerError> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };
    return this.http
      .post<number>(this.serverUrl + 'startBookletByPersonToken.php', {pt: persontoken, b: bookletFilename}, httpOptions)
        .pipe(
          catchError(ErrorHandler.handle)
        );
  }

  // BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
  endBooklet(persontoken: string, bookletDbId: number): Observable<boolean | ServerError> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };
    return this.http
      .post<boolean>(this.serverUrl + 'endBooklet.php', {pt: persontoken, b: bookletDbId}, httpOptions)
        .pipe(
          catchError(ErrorHandler.handle)
        );
  }

  // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
}

export class ErrorHandler {
  public static handle(errorObj: HttpErrorResponse): Observable<ServerError> {
    let myreturn: ServerError = null;
    if (errorObj.error instanceof ErrorEvent) {
      myreturn = new ServerError(500, 'Verbindungsproblem', (<ErrorEvent>errorObj.error).message);
    } else {
      myreturn = new ServerError(errorObj.status, 'Verbindungsproblem', errorObj.message);
      if (errorObj.status === 401) {
        myreturn.labelNice = 'Zugriff verweigert - bitte (neu) anmelden!';
      } else if (errorObj.status === 503) {
        myreturn.labelNice = 'Achtung: Server meldet Datenbankproblem.';
      }
    }

    return of(myreturn);
  }
}


// #############################################################################################

// class instead of interface to be able to use instanceof to check type
export class ServerError {
  public code: number;
  public labelNice: string;
  public labelSystem: string;
  constructor(code: number, labelNice: string, labelSystem) {
    this.code = code;
    this.labelNice = labelNice;
    this.labelSystem = labelSystem;
  }
}

export interface BookletData {
  id: string;
  filename: string;
  label: string;
}

export interface BookletDataListByCode {
  [code: string]: BookletData[];
}

export interface LoginData {
  mode: string;
  groupname: string;
  loginname: string;
  workspaceName: string;
  booklets: BookletDataListByCode;
  code: string;
}

export interface BookletStatus {
  statusLabel: string;
  lastUnit: number;
  canStart: boolean;
  id: number;
  label: string;
}

export interface PersonTokenAndBookletId {
  pt: string;
  b: number;
}
