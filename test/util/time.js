Date.prototype.addDays = function(days) {
    this.setDate(this.getDate() + parseInt(days));
    return this;
};

function nowWithDaysOffset(offset) {
    return (new Date()).addDays(offset)
}

function nowWithDaysBefore(before) {
    var date = new Date();
    date.setDate(date.getDate() - before);
    return date;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { nowWithDaysOffset, nowWithDaysBefore, sleep }
