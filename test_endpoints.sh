mkdir -p output
echo "Testing TypeScript Endpoint..."
curl -s -X POST -H "Content-Type: application/json" -d @payload_ts.json http://localhost:3001/parse/ts > output/ts_output.json
echo "\n\nTesting Python Endpoint..."
curl -s -X POST -H "Content-Type: application/json" -d @payload_py.json http://localhost:3001/parse/py > output/py_output.json
echo "\n\nTesting Java Endpoint..."
curl -s -X POST -H "Content-Type: application/json" -d @payload_java_17.json http://localhost:3001/parse/java > output/java_output.json
