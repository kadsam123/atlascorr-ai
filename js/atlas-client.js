// atlas-client.js
async function submitProductForm(event) {
    event.preventDefault();

    const payload = {
        product_id: document.getElementById("product_id").value,
        company_id: document.getElementById("company_id").value,
        product_name: document.getElementById("product_name").value,
        raw_description: document.getElementById("raw_description").value,
        target_unit_price_cad: parseFloat(document.getElementById("target_price").value),
        export_objective: document.getElementById("export_objective").value,
        export_readiness_level: document.getElementById("export_readiness_level").value,
        available_export_volume: {
            value: parseFloat(document.getElementById("export_volume_value").value),
            unit: document.getElementById("export_volume_unit").value,
        },
        composition_breakdown: [],
        existing_certifications: []
    };

    const response = await fetch("/api/v2/meridiens/product/analyze", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    document.getElementById("product_response").textContent = JSON.stringify(data, null, 2);
}
