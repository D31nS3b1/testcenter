import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CustomTextDefs } from '../../interfaces/customtext.interfaces';
import { customTexts } from '../../objects/customtexts';

@Injectable({
  providedIn: 'root'
})
export class CustomtextService {
  private customTexts: { [key: string]: BehaviorSubject<string | null> } = {};

  addCustomTexts(newTexts: { [key: string]: string }): void {
    Object.keys(newTexts).forEach(key => {
      this.addCustomText(key, newTexts[key]);
    });
  }

  addCustomTextsFromDefs(newTexts: CustomTextDefs): void {
    Object.keys(newTexts).forEach(key => {
      this.addCustomText(key, newTexts[key].defaultvalue);
    });
  }

  private addCustomText(key: string, value: string): void {
    if (typeof this.customTexts[key] === 'undefined') {
      this.customTexts[key] = new BehaviorSubject<string | null>(null);
    }
    this.customTexts[key].next(value);
  }

  getCustomText$(key: string): BehaviorSubject<string | null> {
    if (typeof this.customTexts[key] === 'undefined') {
      this.customTexts[key] = new BehaviorSubject<string | null>(null);
    }
    return this.customTexts[key];
  }

  restoreDefault(all: boolean): void {
    if (typeof this.customTexts === 'undefined') {
      return;
    }

    Object.keys(this.customTexts).forEach(k => {
      if (this.customTexts[k] && customTexts[k]) {
        this.customTexts[k].next(customTexts[k].defaultvalue);
      }
      if (all) {
        if (!(k in customTexts) && this.customTexts[k]) {
          this.customTexts[k] = new BehaviorSubject<string | null>(null);
        }
      }
    });
  }

  getCustomText(key: string): string | null {
    if (typeof this.customTexts[key] === 'undefined') {
      return null;
    }
    return this.customTexts[key].getValue();
  }
}
