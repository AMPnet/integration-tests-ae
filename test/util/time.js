Date.prototype.addDays = function(days) {
    this.setDate(this.getDate() + parseInt(days));
    return this;
};

function nowWithDaysOffset(offset) {
    return (new Date()).addDays(offset)
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { nowWithDaysOffset, sleep }