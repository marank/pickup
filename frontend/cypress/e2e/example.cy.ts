// https://on.cypress.io/api

describe('Start page', () => {
  it('offers to create a pickup', () => {
    cy.visit('/')
    cy.contains('h1', 'Pickup')
    cy.contains('button', 'Create new pickup')
  })
})
