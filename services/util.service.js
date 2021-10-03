function getLabel(labels, labelId) {
    const label = labels.find((label) => label.id === labelId);
    return label;
};

module.exports = {
    getLabel,
}