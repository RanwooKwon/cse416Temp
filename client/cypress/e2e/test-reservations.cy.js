describe("Reservation Page", () => {
    beforeEach(() => {
        cy.visit("/reservations");
    });

    it("Loads campus list", () => {
        const expectedCapmus = [
            "East Campus",
            "Main Campus West",
            "Rd Campus",
            "South Campus",
        ];
        cy.contains("Select campus").click({ force: true });
        expectedCapmus.forEach((campus) => {
            cy.contains(campus).should("exist");
        })
    });

    it("Displays lots - East Campus", () => {
        cy.contains("Select campus").click({ force: true });
        cy.contains("Select campus").click({ force: true });
        cy.get('[role="option"]').contains("East Campus").click({ force: true });
        cy.contains("Select parking lot").click({ force: true });
        cy.contains("Lot A Staff Lot A").should("exist");
        cy.contains("Lot B Amb/Surg East").should("exist");
    });

    it("Displays lots - Main Campus West", () => {
        cy.contains("Select campus").click({ force: true });
        cy.contains("Select campus").click({ force: true });
        cy.get('[role="option"]').contains("Main Campus West").click({ force: true });
        cy.contains("Select parking lot").click({ force: true });
        cy.contains("Lot 1 Admin Overflow").should("exist");
        cy.contains("Lot 2 M & H").should("exist");
    });

    it("Displays lots - Rd Campus", () => {
        cy.contains("Select campus").click({ force: true });
        cy.contains("Select campus").click({ force: true });
        cy.get('[role="option"]').contains("Rd Campus").click({ force: true });
        cy.contains("Select parking lot").click({ force: true });
        cy.contains("Lot 50 AERTC (EV Charging)").should("exist");
        cy.contains("Lot 51 CEWIT").should("exist");
    });

    it("Displays lots - South Campus", () => {
        cy.contains("Select campus").click({ force: true });
        cy.contains("Select campus").click({ force: true });
        cy.get('[role="option"]').contains("South Campus").click({ force: true });
        cy.contains("Select parking lot").click({ force: true });
        cy.contains("Lot 30 South Campus Metered").should("exist");
        cy.contains("Lot 31 South Campus Rockland Hall").should("exist");
    });

    it("Selects reservation date and time", () => {
        cy.contains("Select campus").click({ force: true });
        cy.contains("Select campus").click({ force: true });
        cy.get('[role="option"]').contains("Main Campus West").click({ force: true });
        cy.contains("Select parking lot").click({ force: true });
        cy.get('[role="option"]').contains("Lot 1 Admin Overflow").click({ force: true });
        
        cy.contains("Select date").click({ force: true });
        cy.get("button").filter(":contains('27')").eq(1).click({ force: true });
        cy.contains("Select start time").click({ force: true });
        cy.get('[role="option"]').contains("9:00 AM").click({ force: true });

        cy.contains("Select date").click({ force: true });
        cy.get("button").filter(":contains('28')").eq(1).click({ force: true });
        cy.contains("Select end time").click({ force: true });
        cy.get('[role="option"]').contains("3:00 PM").click({ force: true });
    });

});