"use strict";
module.exports = (time) => {
    const ms = typeof time === "string" ? parseInt(time) : time;
    return new Promise((resolve, reject) => {
        if (isNaN(ms)) {
            reject(`Invalid miliseconds passed in: ${time}`);
        }
        setTimeout(() => resolve(), ms);
    });
};
