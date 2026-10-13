import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const buttonFiles = new Set([
  resolve(root, "src/components/ui/button"),
  resolve(root, "packages/ui/src/button"),
]);

function isButtonImport(source, filename) {
  if (source === "@home-economy/ui/button") return true;
  const path = source.startsWith("@/")
    ? resolve(root, "src", source.slice(2))
    : source.startsWith(".")
      ? resolve(dirname(filename), source)
      : "";
  return buttonFiles.has(path.replace(/\.[cm]?[jt]sx?$/, ""));
}

function findVariable(sourceCode, node, name) {
  for (let scope = sourceCode.getScope(node); scope; scope = scope.upper) {
    if (scope.set.has(name)) return scope.set.get(name);
  }
}

function isSharedButton(context, node) {
  const name = node.name;
  const namespace = name.type === "JSXMemberExpression";
  if (
    namespace &&
    (name.object.type !== "JSXIdentifier" || name.property.name !== "Button")
  )
    return false;
  if (!namespace && name.type !== "JSXIdentifier") return false;
  const variable = findVariable(
    context.sourceCode,
    node,
    namespace ? name.object.name : name.name,
  );
  return variable?.defs.some((definition) => {
    if (definition.type !== "ImportBinding") return false;
    const specifier = definition.node;
    return (
      isButtonImport(definition.parent.source.value, context.filename) &&
      (namespace
        ? specifier.type === "ImportNamespaceSpecifier"
        : specifier.type === "ImportSpecifier" &&
          specifier.imported.name === "Button")
    );
  });
}

function attribute(node, name) {
  // The last explicit value must follow every spread, which could override it.
  let result;
  for (const item of node.attributes) {
    if (item.type === "JSXSpreadAttribute") result = undefined;
    else if (item.name.name === name) result = item;
  }
  return result;
}

function validType(value) {
  if (!value) return false;
  if (
    [
      "JSXExpressionContainer",
      "TSAsExpression",
      "TSSatisfiesExpression",
      "TSTypeAssertion",
      "TSNonNullExpression",
      "ParenthesizedExpression",
    ].includes(value.type)
  )
    return validType(value.expression);
  if (value.type === "Literal")
    return ["button", "submit", "reset"].includes(value.value);
  if (value.type === "ConditionalExpression")
    return validType(value.consequent) && validType(value.alternate);
  // Explicit forwarding is checked by the caller's TypeScript contract.
  return (
    (value.type === "Identifier" && value.name !== "undefined") ||
    value.type === "MemberExpression"
  );
}

const buttonHasType = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      missingType:
        "Shared Button requires an explicit type (button, submit or reset), or literal asChild. Put type after spreads.",
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (!isSharedButton(context, node)) return;
        const asChild = attribute(node, "asChild");
        if (
          asChild &&
          (!asChild.value ||
            (asChild.value.type === "JSXExpressionContainer" &&
              asChild.value.expression.type === "Literal" &&
              asChild.value.expression.value === true))
        )
          return;
        if (!validType(attribute(node, "type")?.value)) {
          context.report({ node, messageId: "missingType" });
        }
      },
    };
  },
};

export default {
  meta: { name: "home-economy" },
  rules: { "button-has-type": buttonHasType },
};
