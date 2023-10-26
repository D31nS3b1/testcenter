import {
  backwardsTo, convertResultsLoginRows,
  deleteDownloadsFolder, forwardTo,
  getFromIframe, loginSuperAdmin,
  loginTestTaker, logoutAdmin, logoutTestTaker, openSampleWorkspace1,
  resetBackendData,
  useTestDB,
  visitLoginPage
} from '../utils';

describe('Check hot-return mode functions', { testIsolation: false }, () => {
  // TODO Testfälle bzgl. Ticket #315 erstellen
  before(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    resetBackendData();
    deleteDownloadsFolder();
  });
  beforeEach(() => {
    useTestDB();
    visitLoginPage();
  });

  it('should be possible to start a hot-return-mode study as login: hret1', () => {
    loginTestTaker('hret1', '201', 'test-hot');

    cy.contains(/^Aufgabe1$/)
      .should('exist');

    cy.intercept(`${Cypress.env('TC_API_URL')}/test/3/unit/UNIT.SAMPLE-101/response`).as('response-1');
    getFromIframe('[data-cy="TestController-radio1-Aufg1"]')
      .click();
    cy.wait('@response-1');

    forwardTo('Aufgabe2');

    cy.intercept(`${Cypress.env('TC_API_URL')}/test/3/unit/UNIT.SAMPLE-102/response`).as('response-2');
    getFromIframe('[data-cy="TestController-radio2-Aufg2"]')
      .click();
    cy.wait('@response-2');

    backwardsTo('Aufgabe1');

    getFromIframe('[data-cy="TestController-radio1-Aufg1"]')
      .should('be.checked');

    cy.intercept(`${Cypress.env('TC_API_URL')}/test/3/unit/UNIT.SAMPLE-102/state`).as('unit-102-state');
    forwardTo('Aufgabe2');
    cy.wait('@unit-102-state');

    logoutTestTaker('hot');
  });

  it('should restore the last given replies from login: hret1', () => {
    loginTestTaker('hret1', '201', 'test-hot');

    cy.contains(/^Aufgabe2$/)
      .should('exist');

    getFromIframe('[data-cy="TestController-radio2-Aufg2"]')
      .should('be.checked');

    backwardsTo('Aufgabe1');

    getFromIframe('[data-cy="TestController-radio1-Aufg1"]')
      .should('be.checked');

    logoutTestTaker('hot');
  });

  it('should be possible to start a hot-return-mode study as login: hret2', () => {
    loginTestTaker('hret2', '202', 'test-hot');

    cy.contains(/^Aufgabe1$/)
      .should('exist');

    cy.intercept(`${Cypress.env('TC_API_URL')}/test/4/unit/UNIT.SAMPLE-101/response`).as('response-1');
    getFromIframe('[data-cy="TestController-radio1-Aufg1"]')
      .click();
    cy.wait('@response-1');

    cy.intercept(`${Cypress.env('TC_API_URL')}/test/4/unit/UNIT.SAMPLE-102/state`).as('unitState102');
    forwardTo('Aufgabe2');
    cy.wait('@unitState102');

    cy.intercept(`${Cypress.env('TC_API_URL')}/test/4/unit/UNIT.SAMPLE-102/state`).as('unitState102-2');
    cy.intercept(`${Cypress.env('TC_API_URL')}/test/4/unit/UNIT.SAMPLE-102/response`).as('response-2');
    getFromIframe('[data-cy="TestController-radio2-Aufg2"]')
      .click();
    cy.wait(['@response-2', '@unitState102-2']);

    logoutTestTaker('hot');
  });

  it('should be a generated file (responses, logs) in the workspace with groupname: SM_HotModes', () => {
    loginSuperAdmin();
    openSampleWorkspace1();
    cy.get('[data-cy="Ergebnisse/Antworten"]')
      .should('exist')
      .click();
    cy.contains('SessionManagement Hot-Modes-Test Logins')
      .should('exist');
    cy.get('[data-cy="results-checkbox1"]')
      .should('exist')
      .click();
    cy.get('[data-cy="download-responses"]')
      .should('exist')
      .click();
    logoutAdmin();
  });

  it('should be saved recent replies from login: hret1 in downloaded response file', () => {
    convertResultsLoginRows('responses')
      .then(responses => {
        expect(responses[1]).to.be.match(/\bhret1\b/);
        expect(responses[1]).to.be.match(/\bUNIT.SAMPLE-101\b/);
        expect(responses[1]).to.be.match(/\bradio1"":""true\b/);
        expect(responses[2]).to.be.match(/\bhret1\b/);
        expect(responses[2]).to.be.match(/\bUNIT.SAMPLE-102\b/);
        expect(responses[2]).to.be.match(/\bradio2"":""true\b/);
      });

    logoutAdmin();
  });

  it('should be saved recent replies from login: hret2 in downloaded response file', () => {
    convertResultsLoginRows('responses')
      .then(responses => {
        expect(responses[3]).to.be.match(/\bhret2\b/);
        expect(responses[3]).to.be.match(/\bUNIT.SAMPLE-101\b/);
        expect(responses[3]).to.be.match(/\bradio1"":""true\b/);
        expect(responses[4]).to.be.match(/\bhret2\b/);
        expect(responses[4]).to.be.match(/\bUNIT.SAMPLE-102\b/);
        expect(responses[4]).to.be.match(/\bradio2"":""true\b/);
      });

    logoutAdmin();
  });
});
