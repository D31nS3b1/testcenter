import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { Component, OnInit, Inject } from '@angular/core';
import { MessageDialogData, MessageType } from '../../interfaces/message-dialog.interfaces';

@Component({
  templateUrl: './message-dialog.component.html',
  styleUrls: ['./message-dialog.component.css']
})
export class MessageDialogComponent implements OnInit {
  constructor(@Inject(MAT_DIALOG_DATA) public msgdata: MessageDialogData) { }

  ngOnInit(): void {
    if ((typeof this.msgdata.title === 'undefined') || (this.msgdata.title.length === 0)) {
      switch (this.msgdata.type) {
        case MessageType.error: {
          this.msgdata.title = 'Achtung: Fehler';
          break;
        }
        case MessageType.warning: {
          this.msgdata.title = 'Achtung: Warnung';
          break;
        }
        default: {
          this.msgdata.title = 'Hinweis';
          break;
        }
      }
    }
    if ((typeof this.msgdata.closebuttonlabel === 'undefined') || (this.msgdata.closebuttonlabel.length === 0)) {
      this.msgdata.closebuttonlabel = 'Schließen';
    }
  }
}
