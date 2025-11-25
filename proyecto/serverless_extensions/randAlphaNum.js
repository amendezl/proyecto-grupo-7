// Returns a random alphanumeric string of given length (default: 8)
function randAlphaNum(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// If run directly, print a random string to stdout
if (require.main === module) {
    const len = process.argv[2] ? parseInt(process.argv[2], 10) : 8;
    console.log(randAlphaNum(len));
}

module.exports = randAlphaNum;

