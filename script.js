const SHEET_ID = "1uhOMr_5kwoOB8krFZlhgvhcGA4W1kjagj8SMjg4ye8w";
const SHEET_GID = "0";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

const COUNTRY_CONFIG = [
    { key: "europe", label: "Europe", currency: "EUR", rateTokens: null },
    { key: "usa", label: "USA", currency: "USD", rateTokens: ["usd", "usa"] },
    { key: "philippines", label: "Philippines", currency: "PHP", rateTokens: ["php", "philippines"] },
    { key: "australia", label: "Australie", currency: "AUD", rateTokens: ["aud", "australie"] },
    { key: "canada", label: "Canada", currency: "CAD", rateTokens: ["cad", "canada"] },
    { key: "taiwan", label: "Taiwan", currency: "TWD", rateTokens: ["twd", "taiwan"] }
];

const PRODUCTS = [
    { name: "Ticket I", europe: 0.99, usa: 0.99, philippines: 49, australia: 1.49, canada: 1.39, taiwan: 33 },
    { name: "Ticket II", europe: 1.99, usa: 1.99, philippines: 119, australia: 2.99, canada: 2.79, taiwan: 70 },
    { name: "Ticket III", europe: 2.99, usa: 2.99, philippines: 179, australia: 4.49, canada: 3.99, taiwan: 100 },
    { name: "Ticket IV", europe: 4.99, usa: 4.99, philippines: 299, australia: 7.99, canada: 6.99, taiwan: 170 },
    { name: "Ticket V", europe: 9.99, usa: 9.99, philippines: 599, australia: 14.99, canada: 13.99, taiwan: 330 },
    { name: "Ticket VI", europe: 19.99, usa: 19.99, philippines: 1190, australia: 29.99, canada: 27.99, taiwan: 670 },
    { name: "Ticket VII", europe: 49.99, usa: 49.99, philippines: 2990, australia: 79.99, canada: 69.99, taiwan: 1690 },
    { name: "Ticket VIII", europe: 99.99, usa: 99.99, philippines: 5990, australia: 149.99, canada: 139.99, taiwan: 3290 }
];

const table = document.getElementById("pricing-table");
const tableHead = table.querySelector("thead");
const tableBody = table.querySelector("tbody");
const statusElement = document.getElementById("table-status");

function parseCsv(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = "";
    let insideQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        const nextChar = text[index + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                currentCell += '"';
                index += 1;
            } else {
                insideQuotes = !insideQuotes;
            }
            continue;
        }

        if (char === "," && !insideQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = "";
            continue;
        }

        if ((char === "\n" || char === "\r") && !insideQuotes) {
            if (char === "\r" && nextChar === "\n") {
                index += 1;
            }

            currentRow.push(currentCell.trim());
            rows.push(currentRow);
            currentRow = [];
            currentCell = "";
            continue;
        }

        currentCell += char;
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
    }

    return rows;
}

function parseFrenchNumber(value) {
    if (!value) {
        return Number.NaN;
    }

    const normalized = value.replace(/\s/g, "").replace(",", ".");
    return Number.parseFloat(normalized);
}

function formatEuro(value) {
    return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

function normalizeHeader(value) {
    return (value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function extractRates(rows) {
    const [headerRow, rateRow] = rows;

    return COUNTRY_CONFIG.reduce((rates, country) => {
        if (!country.rateTokens) {
            rates[country.key] = 1;
            return rates;
        }

        const rateIndex = headerRow.findIndex((cell) => {
            const normalizedHeader = normalizeHeader(cell);
            return country.rateTokens.every((token) => normalizedHeader.includes(token));
        });

        rates[country.key] = rateIndex >= 0 ? parseFrenchNumber(rateRow?.[rateIndex]) : Number.NaN;
        return rates;
    }, {});
}

function renderTable(rates) {
    tableHead.innerHTML = `
        <tr>
            <th scope="col">Produit</th>
            ${COUNTRY_CONFIG.map((country) => `<th scope="col">${country.label}</th>`).join("")}
        </tr>
    `;

    tableBody.innerHTML = PRODUCTS.map((product) => {
        const computedValues = COUNTRY_CONFIG.map((country) => {
            if (country.key === "europe") {
                return {
                    countryKey: country.key,
                    value: product.europe,
                    display: formatEuro(product.europe),
                    valid: true
                };
            }

            const localPrice = product[country.key];
            const rate = rates[country.key];

            if (!Number.isFinite(localPrice) || !Number.isFinite(rate) || rate === 0) {
                return {
                    countryKey: country.key,
                    value: Number.NaN,
                    display: "-",
                    valid: false
                };
            }

            const euroValue = localPrice / rate;
            return {
                countryKey: country.key,
                value: euroValue,
                display: formatEuro(euroValue),
                valid: true
            };
        });

        const validValues = computedValues.filter((item) => item.valid);
        const lowestValue = validValues.length > 0
            ? Math.min(...validValues.map((item) => item.value))
            : Number.NaN;

        const cells = computedValues.map((item) => {
            const isBestPrice = item.valid && Math.abs(item.value - lowestValue) < 0.0001;
            const className = isBestPrice ? "best-price" : "";
            return `<td class="${className}">${item.display}</td>`;
        }).join("");

        return `<tr><th scope="row">${product.name}</th>${cells}</tr>`;
    }).join("");

    const missingRateCountries = COUNTRY_CONFIG
        .filter((country) => country.key !== "europe" && !Number.isFinite(rates[country.key]))
        .map((country) => country.label);

    if (missingRateCountries.length > 0) {
        statusElement.textContent = `Prix finaux en euros calcules avec les taux de la ligne 2. Taux manquant pour : ${missingRateCountries.join(", ")}.`;
        return;
    }

    statusElement.textContent = "Prix finaux en euros calcules a partir des prix locaux et des taux de change.";
}

async function loadSheetRates() {
    try {
        const response = await fetch(CSV_URL);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const csvText = await response.text();
        const rows = parseCsv(csvText).filter((row) => row.some((cell) => cell.trim() !== ""));

        if (rows.length < 2) {
            throw new Error("La feuille ne contient pas la ligne de taux.");
        }

        const rates = extractRates(rows);
        renderTable(rates);
    } catch (error) {
        statusElement.textContent = "Impossible de charger la sheet. Les taux de change n'ont pas pu etre recuperes.";
        tableHead.innerHTML = "";
        tableBody.innerHTML = `
            <tr>
                <td colspan="${COUNTRY_CONFIG.length + 1}">
                    Le tableau n'a pas pu etre calcule car la ligne 2 de la Google Sheet est inaccessible.
                </td>
            </tr>
        `;
        console.error("Erreur lors du chargement des taux :", error);
    }
}

loadSheetRates();
