function getEmissionCategory(co2_emission) {
    if (co2_emission < 5) {
        return "LOW";
    } else if (co2_emission <= 10) {
        return "MODERATE";
    } else {
        return "HIGH";
    }
}
