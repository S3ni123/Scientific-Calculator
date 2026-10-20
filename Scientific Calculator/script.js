"use strict";

/* =========================================
   SCIENTIFIC CALCULATOR
   JavaScript Calculation Engine
========================================= */

const $ = (selector) => document.querySelector(selector);

const expressionDisplay = $("#expression");
const resultDisplay = $("#result");
const statusDisplay = $("#display-status");

const keypad = $("#keypad");

const degreeButton = $("#degree-mode");
const radianButton = $("#radian-mode");
const secondButton = $("#second-toggle");

const themeButton = $("#theme-toggle");

const historyPanel = $("#history-panel");
const historyList = $("#history-list");

let expression = "";
let lastAnswer = 0;
let memory = 0;

let angleMode = "DEG";
let secondMode = false;
let justCalculated = false;

let calculationHistory = [];

/* =========================================
   DISPLAY HELPERS
========================================= */

function formatNumber(number) {
  if (!Number.isFinite(number)) {
    throw new Error("Result is outside the supported range.");
  }

  if (Object.is(number, -0) || Math.abs(number) < 1e-14) {
    number = 0;
  }

  return Number(number.toPrecision(12)).toString();
}

function setStatus(message, isError = false) {
  statusDisplay.textContent = message;
  statusDisplay.style.color = isError ? "#ff8495" : "";
}

function updateDisplay() {
  expressionDisplay.textContent = expression || "";

  if (!expression) {
    resultDisplay.textContent = "0";
    setStatus("Ready");
    return;
  }

  try {
    const result = evaluateExpression(expression, false);

    resultDisplay.textContent = formatNumber(result);
    setStatus(angleMode + " mode");
  } catch {
    resultDisplay.textContent = "—";
    setStatus("Enter a valid expression", true);
  }
}

/* =========================================
   SAFE MATHEMATICAL TOKENIZER
========================================= */

function tokenize(input) {
  const tokens = [];
  let position = 0;

  while (position < input.length) {
    const remaining = input.slice(position);

    const whitespace = remaining.match(/^\s+/);

    if (whitespace) {
      position += whitespace[0].length;
      continue;
    }

    const number = remaining.match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);

    if (number) {
      const value = Number(number[0]);

      if (!Number.isFinite(value)) {
        throw new Error("Invalid number.");
      }

      tokens.push({
        type: "number",
        value,
      });

      position += number[0].length;
      continue;
    }

    const identifier = remaining.match(/^[a-zA-Z]+/);

    if (identifier) {
      tokens.push({
        type: "identifier",
        value: identifier[0].toLowerCase(),
      });

      position += identifier[0].length;
      continue;
    }

    const character = input[position];

    if ("+-*/^!()%".includes(character)) {
      tokens.push({
        type: "operator",
        value: character,
      });

      position++;
      continue;
    }

    throw new Error("Unsupported character: " + character);
  }

  return tokens;
}

/* =========================================
   MATHEMATICAL FUNCTIONS
========================================= */

function factorial(value) {
  if (!Number.isInteger(value) || value < 0 || value > 170) {
    throw new Error("Factorial requires a whole number from 0 to 170.");
  }

  let result = 1;

  for (let i = 2; i <= value; i++) {
    result *= i;
  }

  return result;
}

function toRadians(value) {
  return angleMode === "DEG" ? (value * Math.PI) / 180 : value;
}

function fromRadians(value) {
  return angleMode === "DEG" ? (value * 180) / Math.PI : value;
}

function applyFunction(name, value) {
  switch (name) {
    case "sin":
      return Math.sin(toRadians(value));

    case "cos":
      return Math.cos(toRadians(value));

    case "tan": {
      const radians = toRadians(value);

      if (Math.abs(Math.cos(radians)) < 1e-12) {
        throw new Error("Tangent is undefined at this angle.");
      }

      return Math.tan(radians);
    }

    case "asin":
      if (value < -1 || value > 1) {
        throw new Error("asin requires a value from -1 to 1.");
      }

      return fromRadians(Math.asin(value));

    case "acos":
      if (value < -1 || value > 1) {
        throw new Error("acos requires a value from -1 to 1.");
      }

      return fromRadians(Math.acos(value));

    case "atan":
      return fromRadians(Math.atan(value));

    case "sqrt":
      if (value < 0) {
        throw new Error(
          "Cannot calculate the square root of a negative number.",
        );
      }

      return Math.sqrt(value);

    case "log":
      if (value <= 0) {
        throw new Error("log requires a positive number.");
      }

      return Math.log10(value);

    case "ln":
      if (value <= 0) {
        throw new Error("ln requires a positive number.");
      }

      return Math.log(value);

    case "abs":
      return Math.abs(value);

    case "inv":
      if (value === 0) {
        throw new Error("Cannot divide by zero.");
      }

      return 1 / value;

    case "square":
      return value * value;

    case "factorial":
      return factorial(value);

    case "exp":
      return value * Math.pow(10, memoryExponent());

    default:
      throw new Error("Unknown mathematical function.");
  }
}

function memoryExponent() {
  return 0;
}

/* =========================================
   EXPRESSION PARSER
   Does not use eval() or Function().
========================================= */

function evaluateExpression(input, allowIncomplete = false) {
  const tokens = tokenize(input);

  if (tokens.length === 0) {
    return 0;
  }

  let index = 0;

  function peek() {
    return tokens[index];
  }

  function consume(value) {
    if (peek() && peek().value === value) {
      index++;
      return true;
    }

    return false;
  }

  function expect(value) {
    if (!consume(value)) {
      throw new Error("Expected " + value + ".");
    }
  }

  function startsPrimary(token) {
    if (!token) return false;

    if (token.type === "number") return true;

    if (token.type === "identifier") {
      return (
        token.value === "pi" ||
        token.value === "e" ||
        token.value === "ans" ||
        [
          "sin",
          "cos",
          "tan",
          "asin",
          "acos",
          "atan",
          "sqrt",
          "log",
          "ln",
          "abs",
          "inv",
          "square",
          "factorial",
        ].includes(token.value)
      );
    }

    return token.value === "(";
  }

  function parsePrimary() {
    const token = peek();

    if (!token) {
      throw new Error("Incomplete expression.");
    }

    if (token.type === "number") {
      index++;
      return token.value;
    }

    if (consume("(")) {
      const value = parseAddSubtract();
      expect(")");
      return value;
    }

    if (token.type === "identifier") {
      index++;

      switch (token.value) {
        case "pi":
          return Math.PI;

        case "e":
          return Math.E;

        case "ans":
          return lastAnswer;

        case "sin":
        case "cos":
        case "tan":
        case "asin":
        case "acos":
        case "atan":
        case "sqrt":
        case "log":
        case "ln":
        case "abs":
        case "inv":
        case "square":
        case "factorial":
          return applyFunction(token.value, parseUnary());

        default:
          throw new Error("Unknown function: " + token.value);
      }
    }

    throw new Error("Expected a number or function.");
  }

  function parsePostfix() {
    let value = parsePrimary();

    while (true) {
      if (consume("!")) {
        value = factorial(value);
        continue;
      }

      if (consume("%")) {
        value /= 100;
        continue;
      }

      break;
    }

    return value;
  }

  function parsePower() {
    let value = parsePostfix();

    if (consume("^")) {
      const exponent = parseUnary();
      value = Math.pow(value, exponent);
    }

    return value;
  }

  function parseUnary() {
    if (consume("+")) {
      return parseUnary();
    }

    if (consume("-")) {
      return -parseUnary();
    }

    return parsePower();
  }

  function parseMultiplyDivide() {
    let value = parseUnary();

    while (true) {
      if (consume("*")) {
        value *= parseUnary();
      } else if (consume("/")) {
        const divisor = parseUnary();

        if (divisor === 0) {
          throw new Error("Cannot divide by zero.");
        }

        value /= divisor;
      } else if (startsPrimary(peek())) {
        value *= parseUnary();
      } else {
        break;
      }

      if (!Number.isFinite(value)) {
        throw new Error("Result is outside the supported range.");
      }
    }

    return value;
  }

  function parseAddSubtract() {
    let value = parseMultiplyDivide();

    while (true) {
      if (consume("+")) {
        value += parseMultiplyDivide();
      } else if (consume("-")) {
        value -= parseMultiplyDivide();
      } else {
        break;
      }

      if (!Number.isFinite(value)) {
        throw new Error("Result is outside the supported range.");
      }
    }

    return value;
  }

  const result = parseAddSubtract();

  if (index < tokens.length) {
    if (allowIncomplete) {
      return result;
    }

    throw new Error("Check your expression.");
  }

  if (!Number.isFinite(result)) {
    throw new Error("Result is outside the supported range.");
  }

  return result;
}

/* =========================================
   INPUT HELPERS
========================================= */

function appendValue(value) {
  if (justCalculated) {
    if (/^[0-9.]$/.test(value)) {
      expression = "";
    }

    justCalculated = false;
  }

  expression += value;
  updateDisplay();
}

function insertOperator(operator) {
  if (!expression && operator !== "-") {
    return;
  }

  justCalculated = false;

  if (/[+\-*/^]$/.test(expression)) {
    expression = expression.slice(0, -1);
  }

  expression += operator;
  updateDisplay();
}

function insertFunction(name) {
  const functions = {
    sin: "sin(",
    cos: "cos(",
    tan: "tan(",
    log: "log(",
    ln: "ln(",
    sqrt: "sqrt(",
    absolute: "abs(",
    inverse: "inv(",
  };

  const actualName = functions[name];

  if (!actualName) return;

  if (secondMode) {
    const inverseFunctions = {
      sin: "asin(",
      cos: "acos(",
      tan: "atan(",
    };

    if (inverseFunctions[name]) {
      expression += inverseFunctions[name];
      secondMode = false;
      secondButton.classList.remove("active");
      secondButton.setAttribute("aria-pressed", "false");
      updateDisplay();
      return;
    }
  }

  expression += actualName;
  justCalculated = false;
  updateDisplay();
}

/* =========================================
   CALCULATIONS
========================================= */

function calculate() {
  if (!expression.trim()) return;

  try {
    const answer = evaluateExpression(expression);
    const formattedAnswer = formatNumber(answer);

    calculationHistory.unshift({
      expression,
      result: formattedAnswer,
    });

    calculationHistory = calculationHistory.slice(0, 50);

    lastAnswer = answer;

    expressionDisplay.textContent = expression + " =";
    resultDisplay.textContent = formattedAnswer;

    expression = formattedAnswer;
    justCalculated = true;

    setStatus("Calculated successfully");
    renderHistory();
  } catch (error) {
    setStatus(error.message || "Invalid calculation.", true);
  }
}

function clearCalculator() {
  expression = "";
  justCalculated = false;
  updateDisplay();
}

function deleteLast() {
  if (justCalculated) {
    expression = "";
    justCalculated = false;
    updateDisplay();
    return;
  }

  expression = expression.slice(0, -1);
  updateDisplay();
}

/* =========================================
   SCIENTIFIC ACTIONS
========================================= */

function handleAction(action) {
  switch (action) {
    case "clear":
      clearCalculator();
      break;

    case "delete":
      deleteLast();
      break;

    case "calculate":
      calculate();
      break;

    case "square":
      expression += "^2";
      justCalculated = false;
      updateDisplay();
      break;

    case "power":
      expression += "^";
      justCalculated = false;
      updateDisplay();
      break;

    case "sqrt":
      insertFunction("sqrt");
      break;

    case "inverse":
      insertFunction("inverse");
      break;

    case "sin":
    case "cos":
    case "tan":
    case "log":
    case "ln":
    case "absolute":
      insertFunction(action);
      break;

    case "factorial":
      expression += "!";
      justCalculated = false;
      updateDisplay();
      break;

    case "percent":
      expression += "%";
      justCalculated = false;
      updateDisplay();
      break;

    case "pi":
      appendValue("pi");
      break;

    case "e":
      appendValue("e");
      break;

    case "ans":
      appendValue("ans");
      break;

    case "exp":
      expression += "*10^";
      justCalculated = false;
      updateDisplay();
      break;

    case "sign":
      if (expression) {
        expression = "-(" + expression + ")";
      } else {
        expression = "-";
      }

      justCalculated = false;
      updateDisplay();
      break;

    case "parentheses":
      insertParenthesis();
      break;

    default:
      break;
  }
}

function insertParenthesis() {
  const openCount = (expression.match(/\(/g) || []).length;
  const closeCount = (expression.match(/\)/g) || []).length;

  if (!expression || /[+\-*/^(]$/.test(expression) || openCount > closeCount) {
    expression += "(";
  } else {
    expression += ")";
  }

  justCalculated = false;
  updateDisplay();
}

/* =========================================
   BUTTON EVENTS
========================================= */

keypad.addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (!button) return;

  if (button.dataset.value !== undefined) {
    const value = button.dataset.value;

    if (["+", "-", "×", "÷"].includes(value)) {
      const operators = {
        "+": "+",
        "-": "-",
        "×": "*",
        "÷": "/",
      };

      insertOperator(operators[value]);
    } else {
      appendValue(value);
    }

    return;
  }

  if (button.dataset.action) {
    handleAction(button.dataset.action);
  }
});

/* =========================================
   DEG / RAD MODE
========================================= */

function setAngleMode(mode) {
  angleMode = mode;

  degreeButton.classList.toggle("active", mode === "DEG");
  radianButton.classList.toggle("active", mode === "RAD");

  degreeButton.setAttribute("aria-pressed", String(mode === "DEG"));

  radianButton.setAttribute("aria-pressed", String(mode === "RAD"));

  updateDisplay();
}

degreeButton.addEventListener("click", () => {
  setAngleMode("DEG");
});

radianButton.addEventListener("click", () => {
  setAngleMode("RAD");
});

/* =========================================
   SECOND FUNCTION MODE
========================================= */

secondButton.addEventListener("click", () => {
  secondMode = !secondMode;

  secondButton.classList.toggle("active", secondMode);

  secondButton.setAttribute("aria-pressed", String(secondMode));

  setStatus(secondMode ? "Inverse functions enabled" : angleMode + " mode");
});

/* =========================================
   MEMORY FUNCTIONS
========================================= */

$("#memory-clear").addEventListener("click", () => {
  memory = 0;
  setStatus("Memory cleared");
});

$("#memory-recall").addEventListener("click", () => {
  appendValue(formatNumber(memory));
});

function saveToMemory(operation) {
  try {
    const value = expression ? evaluateExpression(expression) : lastAnswer;

    if (operation === "add") {
      memory += value;
    } else if (operation === "subtract") {
      memory -= value;
    } else {
      memory = value;
    }

    setStatus("Value saved in memory");
  } catch (error) {
    setStatus(error.message, true);
  }
}

/* =========================================
   HISTORY
========================================= */

function renderHistory() {
  historyList.replaceChildren();

  if (calculationHistory.length === 0) {
    const empty = document.createElement("p");

    empty.className = "empty-history";
    empty.textContent = "Your calculations will appear here.";

    historyList.appendChild(empty);
    return;
  }

  calculationHistory.forEach((item, index) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "history-item";

    const expressionText = document.createElement("span");
    expressionText.className = "history-expression";
    expressionText.textContent = item.expression;

    const resultText = document.createElement("span");
    resultText.className = "history-result";
    resultText.textContent = "= " + item.result;

    button.append(expressionText, resultText);

    button.addEventListener("click", () => {
      expression = item.result;
      justCalculated = true;

      updateDisplay();

      historyPanel.hidden = true;
    });

    historyList.appendChild(button);
  });
}

$("#history-toggle").addEventListener("click", () => {
  historyPanel.hidden = !historyPanel.hidden;

  if (!historyPanel.hidden) {
    renderHistory();
  }
});

$("#history-close").addEventListener("click", () => {
  historyPanel.hidden = true;
});

$("#history-clear").addEventListener("click", () => {
  calculationHistory = [];
  renderHistory();
  setStatus("History cleared");
});

/* =========================================
   LIGHT / DARK THEME
========================================= */

themeButton.addEventListener("click", () => {
  document.body.classList.toggle("light-theme");

  const isLight = document.body.classList.contains("light-theme");

  themeButton.innerHTML = isLight
    ? '<i class="fa-solid fa-sun"></i>'
    : '<i class="fa-solid fa-moon"></i>';

  themeButton.setAttribute(
    "aria-label",
    isLight ? "Switch to dark theme" : "Switch to light theme",
  );
});

/* =========================================
   COPY RESULT
========================================= */

$("#copy-result").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(resultDisplay.textContent);
    setStatus("Result copied");
  } catch {
    setStatus("Clipboard unavailable in this browser.", true);
  }
});

/* =========================================
   KEYBOARD SUPPORT
========================================= */

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  if (event.key >= "0" && event.key <= "9") {
    appendValue(event.key);
    return;
  }

  if (event.key === ".") {
    appendValue(".");
    return;
  }

  if (event.key === "+") {
    insertOperator("+");
    return;
  }

  if (event.key === "-") {
    insertOperator("-");
    return;
  }

  if (event.key === "*") {
    insertOperator("*");
    return;
  }

  if (event.key === "/") {
    event.preventDefault();
    insertOperator("/");
    return;
  }

  if (event.key === "^") {
    appendValue("^");
    return;
  }

  if (event.key === "(" || event.key === ")") {
    appendValue(event.key);
    return;
  }

  if (event.key === "Enter" || event.key === "=") {
    event.preventDefault();
    calculate();
    return;
  }

  if (event.key === "Backspace") {
    deleteLast();
    return;
  }

  if (event.key === "Escape") {
    clearCalculator();
  }
});

/* =========================================
   STARTUP
========================================= */

renderHistory();
updateDisplay();
