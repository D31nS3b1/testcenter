import {Injectable} from "@angular/core";
import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot} from "@angular/router";
import {MainDataService} from "./maindata.service";
import {Observable} from "rxjs";
import {AuthAccessKeyType, AuthData, AuthFlagType} from "./app.interfaces";
import {BackendService} from "./backend.service";

@Injectable()
export class RouteDispatcherActivateGuard implements CanActivate {
  constructor(
    private router: Router
  ) {
  }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {

    const authData = MainDataService.getAuthData();
    if (authData) {
      if (authData.token) {
        if (authData.access[AuthAccessKeyType.WORKSPACE_ADMIN] || authData.access[AuthAccessKeyType.SUPER_ADMIN]) {
          this.router.navigate(['/r/admin-starter']);
        } else if (authData.flags.indexOf(AuthFlagType.CODE_REQUIRED) >= 0) {
          this.router.navigate(['/r/code-input']);
        } else if (authData.access[AuthAccessKeyType.TEST]) {
          this.router.navigate(['/r/test-starter']);
        } else if (authData.access[AuthAccessKeyType.TEST_GROUP_MONITOR] || authData.access[AuthAccessKeyType.WORKSPACE_MONITOR]) {
          this.router.navigate(['/r/monitor-starter']);
        } else {
          this.router.navigate(['/r/login', '']);
        }
      } else {
        this.router.navigate(['/r/login', '']);
      }
    } else {
      this.router.navigate(['/r/login', '']);
    }

    return false;
  }
}

@Injectable()
export class DirectLoginActivateGuard implements CanActivate {
  constructor(
    private mds: MainDataService,
    private bs: BackendService,
    private router: Router
  ) {
  }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {

    const authData = MainDataService.getAuthData();
    if (!authData) {
      const directLoginName = state.url.substr(1);
      if (directLoginName.length > 0 && directLoginName.indexOf('/') < 0) {
        this.bs.nameOnlyLogin(directLoginName).subscribe(authData => {
          if (typeof authData !== 'number') {
            this.mds.setAuthData(authData as AuthData);
            this.router.navigate(['/r']);
            return false
          } else {
            return true
          }
        })
      } else {
        return true
      }
    } else {
      return true
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class CodeInputComponentActivateGuard implements CanActivate {
  constructor( private router: Router ) {  }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {

    const authData = MainDataService.getAuthData();
    if (authData) {
      if (authData.flags) {
        if (authData.flags.indexOf(AuthFlagType.CODE_REQUIRED) >= 0) {
          return true
        } else {
          this.router.navigate(['/r']);
          return false
        }
      } else {
        this.router.navigate(['/r']);
        return false
      }
    } else {
      this.router.navigate(['/r']);
      return false
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class AdminComponentActivateGuard implements CanActivate {
  constructor( private router: Router ) {  }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {

    const authData = MainDataService.getAuthData();
    if (authData) {
      if (authData.access) {
        if (authData.access[AuthAccessKeyType.WORKSPACE_ADMIN]) {
          return true;
        } else {
          this.router.navigate(['/r']);
          return false
        }
      } else {
        this.router.navigate(['/r']);
        return false
      }
    } else {
      this.router.navigate(['/r']);
      return false
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class AdminOrSuperAdminComponentActivateGuard implements CanActivate {
  constructor( private router: Router ) {  }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {

    const authData = MainDataService.getAuthData();
    if (authData) {
      if (authData.access) {
        if (authData.access[AuthAccessKeyType.WORKSPACE_ADMIN] || authData.access[AuthAccessKeyType.SUPER_ADMIN]) {
          return true;
        } else {
          this.router.navigate(['/r']);
          return false
        }
      } else {
        this.router.navigate(['/r']);
        return false
      }
    } else {
      this.router.navigate(['/r']);
      return false
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class SuperAdminComponentActivateGuard implements CanActivate {
  constructor( private router: Router ) {  }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {

    const authData = MainDataService.getAuthData();
    if (authData) {
      if (authData.access) {
        if (authData.access[AuthAccessKeyType.SUPER_ADMIN]) {
          return true;
        } else {
          this.router.navigate(['/r']);
          return false
        }
      } else {
        this.router.navigate(['/r']);
        return false
      }
    } else {
      this.router.navigate(['/r']);
      return false
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class TestComponentActivateGuard implements CanActivate {
  constructor( private router: Router ) {  }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {

    const authData = MainDataService.getAuthData();
    if (authData) {
      if (authData.access) {
        if (authData.access[AuthAccessKeyType.TEST]) {
          return true;
        } else {
          this.router.navigate(['/r']);
          return false
        }
      } else {
        this.router.navigate(['/r']);
        return false
      }
    } else {
      this.router.navigate(['/r']);
      return false
    }
  }
}


@Injectable({
  providedIn: 'root'
})
export class GroupMonitorActivateGuard implements CanActivate {

  constructor(
      private router: Router
  ) {}

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot)
      : boolean {

        const authData = MainDataService.getAuthData();

        if (authData) {
          if (authData.access) {
            if (authData.access[AuthAccessKeyType.TEST_GROUP_MONITOR]) {
              return true;
            } else {
              this.router.navigate(['/r']);
              return false
            }
          } else {
            this.router.navigate(['/r']);
            return false
          }
        } else {
          this.router.navigate(['/r']);
          return false
        }
  }
}
