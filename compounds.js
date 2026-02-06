const compounds = {
    // --- BASICS ---
    "H2O": "Water",
    "O2": "Oxygen Gas",
    "H2": "Hydrogen Gas",
    "N2": "Nitrogen Gas",
    "Cl2": "Chlorine Gas",
    "CO2": "Carbon Dioxide",
    "CO": "Carbon Monoxide",
    "O3": "Ozone",
    "H2O2": "Hydrogen Peroxide (Antiseptic)",

    // --- ACIDS ---
    "HCl": "Hydrochloric Acid",
    "H2SO4": "Sulfuric Acid",
    "HNO3": "Nitric Acid",
    "C2H4O2": "Acetic Acid (Vinegar)", // CH3COOH
    "H3PO4": "Phosphoric Acid",
    "HF": "Hydrofluoric Acid",
    "HCN": "Hydrogen Cyanide",
    "H2S": "Hydrogen Sulfide (Rotten Egg Gas)",

    // --- BASES & ALKALIS ---
    "NaOH": "Sodium Hydroxide (Lye)",
    "KOH": "Potassium Hydroxide",
    "CaO2H2": "Calcium Hydroxide (Slaked Lime)", // Ca(OH)2
    "NH3": "Ammonia",
    "NaH1C1O3": "Baking Soda", // NaHCO3 -> Na1 H1 C1 O3

    // --- SALTS & IONIC ---
    "NaCl": "Table Salt",
    "KCl": "Potassium Chloride",
    "CaCl2": "Calcium Chloride",
    "MgCl2": "Magnesium Chloride",
    "KI": "Potassium Iodide",
    "NaF": "Sodium Fluoride",
    "CaC1O3": "Limestone / Chalk", // CaCO3
    "NaN1O3": "Sodium Nitrate",
    "KN1O3": "Gunpowder (Saltpeter)",
    "AgCl": "Silver Chloride",
    "CuS1O4": "Copper Sulfate", // CuSO4
    "FeS": "Iron Sulfide",

    // --- OXIDES ---
    "Fe2O3": "Rust (Iron Oxide)",
    "Fe3O4": "Magnetite",
    "Al2O3": "Ruby / Sapphire (Al oxide)",
    "SiO2": "Quartz / Sand",
    "MgO": "Magnesium Oxide",
    "CaO": "Quicklime",
    "ZnO": "Zinc Oxide",
    "Ti1O2": "Titanium Dioxide (White Pigment)",
    "N2O": "Nitrous Oxide (Laughing Gas)",
    "S1O2": "Sulfur Dioxide",

    // --- ORGANICS (Simple) ---
    "CH4": "Methane",
    "C2H6": "Ethane",
    "C3H8": "Propane",
    "C4H10": "Butane",
    "C2H4": "Ethylene",
    "C2H2": "Acetylene",
    "C6H6": "Benzene",
    "C1H4O1": "Methanol", // CH3OH
    "C2H6O1": "Ethanol (Alcohol)", // C2H5OH
    "C6H12O6": "Glucose (Sugar)",
    "C12H22O11": "Sucrose (Table Sugar)",
    "C3H8O3": "Glycerol",

    // --- EXOTIC / DANGEROUS ---
    "NaC1N1": "Sodium Cyanide", // NaCN
    "C7H5N3O6": "TNT (Explosive)", 
    "C8H10N4O2": "Caffeine",
    "U1F6": "Uranium Hexafluoride",
};

// Helper to check recipe
// recipe: { "H": 2, "O": 1 }
function checkCompound(recipe) {
    for (const [key, name] of Object.entries(compounds)) {
        if (matchesRecipe(key, recipe)) return { formula: key, name: name };
    }
    return null;
}

function matchesRecipe(formula, recipe) {
    const parsed = parseFormula(formula);
    const keys1 = Object.keys(parsed).sort();
    const keys2 = Object.keys(recipe).sort();
    
    if (keys1.length !== keys2.length) return false;
    
    for(let i = 0; i < keys1.length; i++) {
        const el = keys1[i];
        if (keys2[i] !== el) return false;
        if (parsed[el] !== recipe[el]) return false;
    }
    
    return true;
}

function parseFormula(f) {
    const r = {};
    const regex = /([A-Z][a-z]*)(\d*)/g;
    let m;
    while ((m = regex.exec(f)) !== null) {
        if (m.index === regex.lastIndex) regex.lastIndex++; 
        const el = m[1];
        const count = m[2] ? parseInt(m[2]) : 1;
        r[el] = (r[el] || 0) + count;
    }
    return r;
}
