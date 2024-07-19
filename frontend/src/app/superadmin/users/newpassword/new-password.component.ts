import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { FormGroup, Validators, FormControl } from '@angular/forms';

@Component({
  templateUrl: './new-password.component.html'
})

export class NewPasswordComponent {
  newPasswordForm = new FormGroup({
    pw: new FormControl('', [Validators.required, Validators.minLength(10), Validators.pattern('(?=.*/[0-9]/)(?=.*/[A-Z]/)(?=.*/[a-z]/)(?=.*/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)')])
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: string) { }
}
