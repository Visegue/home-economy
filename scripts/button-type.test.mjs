// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));

function lint(code) {
  const directory = mkdtempSync(join(tmpdir(), "button-type-"));
  try {
    const file = join(directory, "cancel.tsx");
    writeFileSync(
      file,
      code.replaceAll(
        "__RELATIVE_BUTTON__",
        relative(directory, join(root, "packages/ui/src/button")),
      ),
    );
    const result = spawnSync(
      process.execPath,
      [
        join(root, "node_modules/oxlint/bin/oxlint"),
        "--config",
        join(root, ".oxlintrc.json"),
        "--allow",
        "eslint/no-unused-vars",
        "--allow",
        "nextjs/no-html-link-for-pages",
        "--format",
        "json",
        file,
      ],
      { cwd: root, encoding: "utf8" },
    );
    if (result.error) throw result.error;
    return { status: result.status, ...JSON.parse(result.stdout) };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

it("blocks the old cancellation pattern and accepts its explicit button correction", () => {
  const source = `import { Button as Cancel } from "@/components/ui/button";
export function RemoveExpenseForm() {
  return <form><Cancel onClick={() => {}}>Avbryt</Cancel></form>;
}`;
  const failed = lint(source);
  expect(failed.status).toBe(1);
  expect(failed.diagnostics).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "home-economy(button-has-type)",
        labels: expect.arrayContaining([
          expect.objectContaining({
            span: expect.objectContaining({ line: 3 }),
          }),
        ]),
      }),
    ]),
  );
  expect(
    lint(source.replace("<Cancel onClick", '<Cancel type="button" onClick'))
      .status,
  ).toBe(0);
});

it("enforces the native HTML rule through the repository lint configuration", () => {
  expect(
    lint("export const Cancel = () => <button>Avbryt</button>;").diagnostics,
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "react(button-has-type)" }),
    ]),
  );
  expect(
    lint('export const Cancel = () => <button type="button">Avbryt</button>;')
      .status,
  ).toBe(0);
});

it.each([
  "@/components/ui/button",
  "@home-economy/ui/button",
  "__RELATIVE_BUTTON__",
  "__RELATIVE_BUTTON__.tsx",
])("tracks named and namespace aliases from %s", (source) => {
  const result = lint(`import { Button as Cancel } from "${source}";
import * as Controls from "${source}";
export const Form = () => <><Cancel /><Controls.Button /></>;`);
  expect(
    result.diagnostics.filter(
      (diagnostic) => diagnostic.code === "home-economy(button-has-type)",
    ),
  ).toHaveLength(2);
});

it.each([
  '"button"',
  '"submit"',
  '"reset"',
  '{"button"}',
  '{"button" as const}',
  '{"submit" satisfies "submit"}',
  '{submit ? "submit" : "button"}',
  "{type}",
  "{props.type}",
])("accepts explicit type %s", (type) => {
  expect(
    lint(`import { Button } from "@home-economy/ui/button";
export const Control = ({ type, props, submit }) => <Button type=${type} />;`)
      .status,
  ).toBe(0);
});

it.each([
  '"invalid"',
  "{undefined}",
  "{null}",
  "{true}",
  '{"invalid" as const}',
  '{submit ? "submit" : undefined}',
])("rejects invalid type %s", (type) => {
  expect(
    lint(`import { Button } from "@home-economy/ui/button";
export const Control = ({ submit }) => <Button type=${type} />;`).status,
  ).toBe(1);
});

it("preserves slot navigation but checks child buttons and dynamic asChild", () => {
  expect(
    lint(`import { Button } from "@home-economy/ui/button";
export const Navigation = () => <><Button asChild><a href="/">Hem</a></Button><Button asChild={true}><a href="/">Hem</a></Button></>;`)
      .status,
  ).toBe(0);
  expect(
    lint(`import { Button } from "@home-economy/ui/button";
export const Control = ({ slot }) => <><Button asChild={slot} /><Button asChild={false} /><Button asChild><button>Avbryt</button></Button><Button asChild><Button /></Button></>;`)
      .diagnostics,
  ).toHaveLength(4);
});

it("does not confuse unrelated or shadowed components with the shared import", () => {
  expect(
    lint(`import { Button } from "other-ui";
export const Control = () => <Button />;`).status,
  ).toBe(0);
  expect(
    lint(`import { Button } from "@home-economy/ui/button";
export function Control({ Button }) { return <Button />; }`).status,
  ).toBe(0);
});

it("checks wrapper implementations while allowing safe defaults and explicit forwarding", () => {
  expect(
    lint(`import { Button } from "@home-economy/ui/button";
function Safe({ type = "button", ...props }) { return <Button {...props} type={type} />; }
export const Control = () => <Safe />;`).status,
  ).toBe(0);
  expect(
    lint(`import { Button } from "@home-economy/ui/button";
export function Unsafe(props) { return <Button {...props} />; }`).status,
  ).toBe(1);
});

it("requires type or literal asChild after any potentially overriding spread", () => {
  expect(
    lint(`import { Button } from "@home-economy/ui/button";
export const Control = ({ props }) => <><Button type="button" {...props} /><Button asChild {...props}><a href="/">Hem</a></Button></>;`)
      .diagnostics,
  ).toHaveLength(2);
  expect(
    lint(`import { Button } from "@home-economy/ui/button";
export const Control = ({ props }) => <><Button {...props} type="button" /><Button {...props} asChild><a href="/">Hem</a></Button></>;`)
      .status,
  ).toBe(0);
});
