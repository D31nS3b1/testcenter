import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

const upperLowerSymbolNumberRegex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W)/;

@Component({
  templateUrl: './new-user.component.html'
})

export class NewUserComponent {
  newUserForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(3)]),
    pw: new FormControl('', [Validators.required, Validators.pattern(upperLowerSymbolNumberRegex)])
  });
}
