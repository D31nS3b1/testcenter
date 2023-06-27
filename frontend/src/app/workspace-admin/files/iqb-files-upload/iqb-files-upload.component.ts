import {
  Component, EventEmitter, HostBinding, Input, OnDestroy, OnInit, Output
} from '@angular/core';
import { Subscription } from 'rxjs';
import { BackendService } from '../../backend.service';
import { UploadReport, UploadStatus } from '../files.interfaces';
import { WorkspaceDataService } from '../../workspacedata.service';

@Component({
  selector: 'tc-files-upload',
  templateUrl: './iqb-files-upload.component.html',
  styleUrls: ['../iqb-files.scss']
})
export class IqbFilesUploadComponent implements OnInit, OnDestroy {
  @HostBinding('class') myclass = 'iqb-files-upload';

  constructor(
    private bs: BackendService,
    public wds: WorkspaceDataService
  ) { }

  private _status: UploadStatus;
  get status(): UploadStatus {
    return this._status;
  }

  set status(newstatus: UploadStatus) {
    this._status = newstatus;
    this.statusChangedEvent.emit(this);
  }

  private requestResponse: UploadReport;
  get uploadResponse(): UploadReport {
    switch (this._status) {
      case UploadStatus.busy:
        return { '': { info: ['Bitte warten'] } };
      case UploadStatus.ready:
        return { '': { info: ['Bereit'] } };
      default:
        return this.requestResponse;
    }
  }

  /* Http request input bindings */

  @Input()
  fileAlias = 'file';

  @Input()
  folderName = '';

  @Input()
  folder = '';

  @Input()
  get files(): File[] {
    return this._files;
  }

  set files(files: File[]) {
    this._files = files;
    this._filedates = files.map(file => file.lastModified);
  }

  @Input()
  set id(id: number) {
    this._id = id;
  }

  get id(): number {
    return this._id;
  }

  @Output() removeFileRequestEvent = new EventEmitter<IqbFilesUploadComponent>();
  @Output() statusChangedEvent = new EventEmitter<IqbFilesUploadComponent>();

  progressPercentage = 0;
  private _files: File[];
  private _filedates: number[] = [];
  private _id: number;
  private fileUploadSubscription: Subscription;

  ngOnInit(): void {
    this._status = UploadStatus.ready;
    this.requestResponse = {};
    this.upload();
  }

  upload(): void {
    if (this.status !== UploadStatus.ready) {
      return;
    }

    this.status = UploadStatus.busy;
    const formData = new FormData();
    for (const file of this._files) {
      formData.append(this.fileAlias.concat('[]'), file, file.name);
    }
    if ((typeof this.folderName !== 'undefined') && (typeof this.folder !== 'undefined')) {
      if (this.folderName.length > 0) {
        formData.append(this.folderName, this.folder);
      }
    }

    this.fileUploadSubscription = this.bs.uploadFile(this.wds.workspaceID, formData)
      .subscribe(res => {
        this.requestResponse = res.report;
        this.status = res.status;
        this.progressPercentage = res.progress;
      });
  }

  ngOnDestroy(): void {
    if (this.fileUploadSubscription) {
      this.fileUploadSubscription.unsubscribe();
    }
  }
}
