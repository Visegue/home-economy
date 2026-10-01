# Household Finance

This context describes how a Household understands and organizes its recurring finances across calendar months.

## Language

English terms are canonical domain names; **Svenska** records their Swedish display names. Definitions describe the domain, including concepts whose functionality is still to come.

### Monthly view

**Monthly Overview**:
**Svenska**: Månadsöversikt.
A consolidated view of the Household's Income and the amounts to pay as Expenses, allocate for future Expenses, contribute to Savings, and fund for Replacements during one calendar month. The month is a reporting window, not the smallest interval for changes: underlying items can remain unchanged for years or change on a specific calendar date, and have their own payment or contribution schedules.
_Avoid_: Monthly Plan, Snapshot

**Monthly Remainder**:
**Svenska**: Kvar efter månadens utgifter och avsättningar.
The month's Income less Direct Expenses, Monthly Allocations, Savings Contributions, and Replacement Contributions, with payments from previously funded Reserves not deducted again. It is unknown when no Income is configured for the month; configured zero Income is a known value.
_Avoid_: Available Household Funds, Account Balance

### Effective dates and validity

**Effective Date**:
**Svenska**: Gäller från.
The calendar date from which new values for a Household's financial item apply, which need not be the first day of a month. It is distinct from when a payment or transfer occurs.

**Validity Period**:
**Svenska**: Giltighetsperiod.
The date interval during which a particular version of a Household's financial item applies, with an optional end date. It is independent of the monthly reporting window and of when money is paid or transferred.

**Scheduled Day**:
**Svenska**: Planerad dag.
The day of the month on which an Income, Direct Expense or contribution is expected. It is a planning guideline, not an instruction to move money.

### Expenses

**Expense**:
**Svenska**: Utgift (plural: Utgifter).
A tracked cost that belongs to the Household and may optionally be associated with one or more Household People.
_Avoid_: Spending

**Direct Expense**:
**Svenska**: Direkt utgift (plural: Direkta utgifter).
An Expense paid directly from the Income available in the month when it is due.

**Allocated Expense**:
**Svenska**: Avsatt utgift (plural: Avsatta utgifter).
A known future recurring or one-off Expense funded progressively before it becomes due.

**Monthly Allocation**:
**Svenska**: Månadsavsättning.
The amount set aside for an Allocated Expense during one calendar month.

**Expense Reserve**:
**Svenska**: Reserverat för utgifter.
The money accumulated through Monthly Allocations and committed to an Allocated Expense when it becomes due. This money is excluded from Available Household Funds because it covers an existing purchase or an expected payment obligation.

**Reserve Funding**:
**Svenska**: Överföring till avsättningar.
A confirmed movement of money into an Expense Reserve for a selected Monthly Allocation. It increases the money earmarked for the individual Expense within the receiving Account.

**Reserve Payment**:
**Svenska**: Betalning från avsättningar.
An individual payment occurrence funded by an Expense Reserve, with its own due date. It is overdue when its due date has passed and it has not been realized.

**Reserve Payment Realization**:
**Svenska**: Reglering av avsatt utgift.
The use of reserved money either to pay a Reserve Payment directly or to reimburse the Account from which that payment was made.

### Savings and holdings

**Savings Purpose**:
**Svenska**: Sparändamål (section label: Sparande).
An individually tracked reason for setting money aside, such as a vacation or Household Buffer, without requiring a target amount or date.
_Avoid_: Savings Goal

**Savings Contribution**:
**Svenska**: Sparavsättning.
The amount assigned to a Savings Purpose during one calendar month.

**Account**:
**Svenska**: Konto (plural: Konton).
A real holding location for cash or Investments. One Account may hold money assigned to several purposes and Reserves.
_Avoid_: Savings Purpose, Reserve

**Earmark**:
**Svenska**: Öronmärkning.
A logical assignment of money held in an Account to an Expense Reserve, Savings Purpose, or Replacement Reserve. Expense Reserve earmarks represent commitments, while Savings Purpose and Replacement Reserve earmarks express intentions that the Household can reconsider.

**Confirmed Transfer**:
**Svenska**: Registrerad överföring.
A manually confirmed deposit into or withdrawal from an Earmark, with its actual date and amount. Several transfers may occur in a month, independently of the expected contributions.

**Attribution Month**:
**Svenska**: Avser månad.
The reporting month against whose expected contribution a Confirmed Transfer is counted. It does not change when the transfer affects the Earmark's value.

**Opening Value**:
**Svenska**: Ingående värde.
The known value belonging to an Earmark at a specified date before its recorded transfers. Expected contributions do not establish an Opening Value.

**Available Household Funds**:
**Svenska**: Tillgängliga medel.
The Household's funds available after excluding money committed to Expense Reserves, including money assigned to Savings Purposes and Replacement Reserves. Inclusion does not imply that the money can be withdrawn or converted to cash immediately.

**Unassigned Household Funds**:
**Svenska**: Ej öronmärkta medel.
The portion of Available Household Funds that is not earmarked for Savings Purposes or Replacement Reserves. It can be used without redirecting money from an existing purpose.

**Net Worth**:
**Svenska**: Nettoförmögenhet.
The total value of the Household's assets minus its liabilities, including loans. Earmarking money does not itself change Net Worth.

**Investment**:
**Svenska**: Investering (plural: Investeringar).
Money held in assets whose market value is expected to increase or decrease independently of contributions and withdrawals. An Investment is a value-bearing holding, not the purpose for which its value is earmarked.

### Replacements

**Replaceable Asset**:
**Svenska**: Tillgång att ersätta.
A durable purchase whose usefulness or value declines and that the Household expects to replace in the future.

**Replacement Reserve**:
**Svenska**: Avräkning (plural: Avräkningar).
Money accumulated, and potentially invested, to fund the future replacement of a Replaceable Asset.
_Avoid_: Settlement, Reconciliation, Depreciation

**Replacement Contribution**:
**Svenska**: Månadsavsättning för avräkning.
The monthly amount assigned to a Replacement Reserve based on expected replacement cost, replacement horizon, inflation, and any anticipated investment growth.
