Date.prototype.addDays = function(days) {
    this.setDate(this.getDate() + parseInt(days));
    return this;
};

function nowWithDaysOffset(offset) {
    return (new Date()).addDays(offset)
}

module.exports = { nowWithDaysOffset }