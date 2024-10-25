import {
  deleteDownloadsFolder, loginSuperAdmin, useTestDB, openSampleWorkspace,
  resetBackendData, logoutAdmin, visitLoginPage
} from '../utils';

describe('Workspace-Admin-system', () => {
  beforeEach(deleteDownloadsFolder);
  beforeEach(resetBackendData);
  beforeEach(useTestDB);
  beforeEach(visitLoginPage);
  beforeEach(loginSuperAdmin);
  beforeEach(() => openSampleWorkspace(1));

  afterEach(logoutAdmin);

  it('should be possible to download a systemcheck summary (csv)', () => {
    cy.get('[data-cy="System-Check Berichte"]')
      .click();
    cy.get('[data-cy="systemcheck-checkbox"]')
      .click();
    cy.get('[data-cy="download-button"]')
      .click();
    cy.readFile('cypress/downloads/iqb-testcenter-syscheckreports.csv')
      .should('exist');
  });
});
