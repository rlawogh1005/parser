const fs = require('fs');
const path = require('path');
const https = require('https');

const LIB_DIR = path.join(__dirname, '..', 'lib');
const JAR_URL = 'https://repo1.maven.org/maven2/com/github/javaparser/javaparser-core/3.26.2/javaparser-core-3.26.2.jar';
const JAR_PATH = path.join(LIB_DIR, 'javaparser-core.jar');

if (!fs.existsSync(LIB_DIR)) {
    fs.mkdirSync(LIB_DIR, { recursive: true });
}

console.log(`Downloading JavaParser jar to ${JAR_PATH}...`);

const file = fs.createWriteStream(JAR_PATH);
https.get(JAR_URL, function(response) {
    if (response.statusCode !== 200) {
        console.error(`Failed to download: Status Code ${response.statusCode}`);
        return;
    }
    response.pipe(file);
    file.on('finish', function() {
        file.close(() => {
            console.log('Download completed.');
        });
    });
}).on('error', function(err) {
    fs.unlink(JAR_PATH); 
    console.error('Error downloading file:', err.message);
});
