# Gemensam UI-grund

`packages/ui` är det privata paketet `@home-economy/ui`. Appen ligger kvar i roten. Paketet konsumeras via separata exports, exempelvis `@home-economy/ui/button`, inte en gemensam klient-barrel. `src/components/ui/*` och de flyttade presentationskomponenterna i `src/components/` är tunna kompatibilitetsfasader till samma implementation. De behåller befintliga importvägar utan parallella lokala varianter.

Paketet äger tokens, typografi, avstånd, basprimitiver och delad presentation. Appen äger routing, auth, hushållsdata, ekonomiska beräkningar och skrivningar. `pnpm check:ui` kontrollerar att paketets produktionsfiler endast importerar interna filer eller deklarerade UI-/React-beroenden. ADR 0006 gäller; denna flytt kräver inget nytt arkitekturbeslut.

## Användning

```tsx
import { Button } from "@home-economy/ui/button";
import { Input } from "@home-economy/ui/input";
import { Label } from "@home-economy/ui/label";
import { FormActions } from "@home-economy/ui/layout";

<div className="ui-field">
  <Label htmlFor="name">Namn</Label>
  <Input id="name" name="name" required />
</div>
<FormActions><Button type="submit">Spara</Button></FormActions>
```

Behåll Server Components som standard. Endast interaktiva exports har `"use client"`. `Button`, `Input`, kort, tabeller, `PageHeading`, `AuthLayout`, `FormActions` och klassammanslagning kan konsumeras direkt av serverrenderad presentation. Radix-kontroller, dialogskydd och teman har egna klientgränser. Domänvalidering flyttas aldrig till UI-paketet.

- En sida har en explicit h1. `PageHeading` används av AppShells register över samtliga sidor, inklusive Historik och Överföringar. Auth/onboarding använder `CardTitle as="h1"`; kortsektioner använder h2 och undersektioner h3. Dialogrubriker behåller Radix semantik och namngivning.
- `ui-field` delar avstånd mellan etikett och kontroll. `ui-error` delar feltextens presentation. `FormActions` delar den nåbara sticky åtgärdsfoten, inklusive safe area. Dessa ändrar inte när validering eller fel körs; #83 inför det separata submit/blur-kontraktet.
- Grid och maxbredd följer innehållet. Månadsöversikten kan vara bred, inställningar max-w-4xl, auth max-w-lg, lösenordsflöden max-w-md. `AuthLayout` delar auths baslayout, med separat toppplacerad onboardingheader. Domängrids förblir vanliga CSS-klasser.
- `ChoiceInput` delar native checkbox/radio och fokus/disabled-presentation. Innehållet skiljer sig fortsatt mellan typkort, ägarflerval, färgval och bekräftelser. `Label` behåller synlig etikett och kontrollkoppling.
- Ikonåtgärder använder `ActionIconButton` med namn, tooltip och pending-spärrning. `InfoButton` fungerar genom klick, touch och tangentbord. Tvetydiga bekräftelser har uttrycklig text.
- Använd semantiska tokens för yta, text, fokus, fel och diagram. Dagens ljusa tokenvärden är bevarade i `packages/ui/styles.css`; den mörka profilen ligger intill dem. Ingen experimentpalett är införd.

## Tema och navigation

Rootlayouten importerar `src/app/globals.css`, som ansluter Tailwinds byggverktyg, UI-paketets stylesheet och explicita Tailwind-källor i paketet. Temabyte applicerar text och ytor samtidigt utan blandade övergångsfärger. Ett litet inline-script i document head applicerar webbläsarens val före första målning. Endast htmls förväntade temaattribut får `suppressHydrationWarning`. `ThemeProvider` följer OS-byte och andra flikars lagringsändringar även när inställningssidan är stängd.

Inställningarnas `ThemePicker` erbjuder System/Ljust/Mörkt. System är standard och fallbacksval för saknat, ogiltigt eller otillgängligt lagrat värde. Nyckeln `home-economy-theme-v1` innehåller bara preferensen, inga konto- eller hushållsuppgifter. Explicit val går före OS och gäller även login/onboarding, portaler och native datum-/månadskontroller via `color-scheme`. Om skrivning till lagring nekas används valet under pågående session.

AppShell komponeras fortsatt i appen. De fem huvudmålen visas i toppmeny från 64rem och i bottenmeny under den bredden. Historik/Överföringar nås från Månaden och markerar det målet. Innehållet reserverar bottenmenyns höjd och safe area. Vid fokuserat formulär och krympt visualViewport döljs bottenmenyn för tangentbordet; dialogens befintliga viewport- och fokushantering bevaras. Menyn är inte sticky på desktop och täcker därför inte innehåll vid zoom/scroll. Länkar behåller Nexts befintliga routing/prefetch-beteende.

## Konsumentinventering och avsiktliga undantag

| Område                    | Konkreta konsumenter                                                                                                                                                                                                  | Delad grund / appansvar                                                                                                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Alla appsidor             | `src/app/(app)/page.tsx`, `salary/page.tsx`, `investments/page.tsx`, `balance/page.tsx`, `settings/page.tsx`, `history/page.tsx`, `transfers/page.tsx`; `src/components/app-shell.tsx`                                | Gemensamma tokens, kontroller, kort och explicita sidrubriker; routing och dataläsning i appen. Historik/Överföringar har inte egna extra h1.                                  |
| Auth/onboarding           | `src/app/login/{page,login-form}.tsx`, `forgot-password/{page,forgot-password-form}.tsx`, `reset-password/{page,reset-password-form}.tsx`, `onboarding/{page,onboarding-form}.tsx`                                    | AuthLayout, CardTitle h1, fältpresentation och temat från root. Authkoppling, autocomplete och generiska authfel behålls.                                                      |
| Basprimitiver             | `src/components/ui/{badge,button,card,chart,dialog,dropdown-menu,input,label,popover,progress,select,separator,sheet,skeleton,table,tabs,tooltip}.tsx`                                                                | Samtliga exports är fasader till motsvarande filer i `packages/ui/src`. Ingen parallell lokal implementation.                                                                  |
| Återkommande presentation | `src/components/{action-icon-button,add-card-button,collapsible-card,form-dialog,form-dialog-content,info-button,kpi-card,feature-placeholder}.tsx`                                                                   | Flyttade till paketet, med samma dialog-/dirty-/pending-/fokuskontrakt.                                                                                                        |
| Utgifter/inkomst          | `src/features/budget/{forms,income-form,settlement-fields}.tsx`; `src/features/income/income-field.tsx`                                                                                                               | Gemensamma fält, ChoiceInput, etiketter, hjälp/fel och åtgärdsfot. Domänregler, låst typ, versionskontrakt och typvisa utkast stannar appen; typkortets omdesign hör till #83. |
| Sparande/överföringar     | `src/features/savings/saving-form.tsx`, `src/features/funding/transfer-form.tsx`                                                                                                                                      | Samma fält/etikett/fel/kontrollgrund. Sparandets footer delas; överföringens bekräftelse och semantik behålls.                                                                 |
| Medlemmar/konto           | `src/features/households/members/forms.tsx`, `src/features/account/account-settings.tsx`, `src/components/user-menu.tsx`                                                                                              | Gemensamma dialoger och kontroller. Identitet, auth, färgmodell och medlemshantering ligger kvar i appen.                                                                      |
| Perioder                  | `src/features/periods/{fields,defaults-form,change-notice}.tsx`, `src/features/dashboard/month-selector.tsx`                                                                                                          | Gemensamma Input/Label/ChoiceInput och tokens; datumens olika betydelser och navigation oförändrade.                                                                           |
| Översikt/detaljer         | `src/features/dashboard/{overview-dashboard,overview-table,cash-flow-chart,item-details,post-details,post-management}.tsx`, `src/features/budget/settlements-section.tsx`, `src/features/savings/savings-section.tsx` | Kort/tabell/diagram/dialogpresentation från paketet. Serverrenderade belopp, radgester, stabil postidentitet och #66:s modal-/fokusflöde stannar i appen.                      |
| Notiser och leveransinfo  | `src/components/save-notice.tsx`, `deployment-info.tsx`, `card-management.tsx`                                                                                                                                        | Delade kontroller/tokens. Sparnotisens period-/domäntext, releaseinformationen och hanteringslägets komposition förblir appansvar.                                             |
| Medlemsavatarer           | `src/components/{member-avatar,member-avatar-group}.tsx`, `src/features/households/members/appearance.ts`                                                                                                             | Temaanpassad kant, men fasta identitetsfärger och kontrastberäknad avatartext bevaras.                                                                                         |

Radens namnknapp i `dashboard/item-details.tsx` är en avsiktlig native variant: tabellsemantik, textmarkering/scroll, ett tangentbordsmål och stabil triggerref hör till radens interaktionskontrakt. Den använder paketets tokens för text och fokus. Dolda formulärfält är transport av appdata, inte synliga kontrollvarianter. `CashFlowChart` förblir appkomposition; Recharts interna `#ccc/#fff`-selektorer i paketet ersätts redan med tokens.

Google-logons officiella färger i `login-form.tsx` och medlemsfärgernas betydelse är avsiktliga undantag. HTML-mejl i `src/lib/auth/email.ts` har egen e-postpresentation och följer inte webbläsarens temapreferens. Inget av detta är en alternativ generell apppalett.

## Kontroller och release

Workspace-paketet använder källexports utan separat bygg-/publiceringsflöde. Appens TypeScript-konfiguration omfattar paketkällorna. Vitest upptäcker dess tester, Next transpilerar paketet, och Tailwind läser dess klasser. Båda `components.json`-konfigurationerna pekar på paketets källor och `packages/ui/styles.css`, så även shadcn-ändringar från approten hamnar hos tokenägaren.

`pnpm check` kör gränskontroll, format, lint, typkontroll, tester och produktionsbygge. `packages/ui/` är releasepåverkande i versionskontrollen och omfattas av preview migration gate för externa ändringar. Appen följer samma befintliga CI-/preview-/releaseflöde och en minorhöjning till 0.15.0 för de nya temavalen. Paketets privata 0.0.0 är ingen separat produktrelease.

Webbläsartesterna i `e2e/ui-theme.spec.ts` täcker teman, OS-byte, omladdning, auth/onboarding, native kontroller, dialogskydd, sidrubriker och navigering vid 320/768/1024/1440px. Befintliga E2E behåller samtliga ekonomiska flöden, pending-/dirty-skydd och #66:s fokusregressioner. Skärmbilder ska granskas från faktisk app i båda teman; kontrastvärden eller gröna tester ersätter inte visuell kontroll. Säkerhets- och produktionsbevis sparas per slutlig SHA enligt release-runbooken.
