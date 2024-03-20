import {
  Component, EventEmitter, Input, Output
} from '@angular/core';

@Component({
  selector: 'tc-page-nav',
  template: `
    <span [style.color]="'white'" [style.padding-right.px]="8">
        {{ ''  | customtext:'login_pagesNaviPrompt' | async}}
    </span>

    <button mat-stroked-button [disabled]="currentPageIndex == 0"
                       (click)="navPrevious.emit()">
      <i class="material-icons">chevron_left</i>
    </button>

    <mat-button-toggle-group [value]="currentPageIndex">
      <mat-button-toggle *ngFor="let page of pages; let index = index"
                         [class.selectedValue]="currentPageIndex == index"
                         [matTooltip]="page"
                         [attr.data-cy]="'page-navigation-' + index"
                         [value]="index"
                         (click)="navToPage.emit(index)">
        {{ index + 1 }}
      </mat-button-toggle>
    </mat-button-toggle-group>

    <button mat-stroked-button [disabled]="currentPageIndex == pages.length - 1"
                       (click)="navNext.emit()">
      <i class="material-icons">chevron_right</i>
    </button>
  `,
  styles: [`
    .selectedValue {background-color: var(--mat-standard-button-toggle-selected-state-background-color);}
    button { height: 34px !important; margin-bottom: 2px;}
    mat-button-toggle-group {height: 34px; align-items: center;}
  `]
})
export class PageNavBarComponent {
  @Input() pages: string[] = [];
  @Input() currentPageIndex!: number;
  @Output() navPrevious = new EventEmitter();
  @Output() navNext = new EventEmitter();
  @Output() navToPage = new EventEmitter<number>();
}
