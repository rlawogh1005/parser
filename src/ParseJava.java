import com.github.javaparser.JavaParser;
import com.github.javaparser.ParseResult;
import com.github.javaparser.ParserConfiguration;
import com.github.javaparser.Range;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.Node;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;

public class ParseJava {
    public static void main(String[] args) {
        if (args.length == 0) {
            System.err.println("No file provided");
            System.exit(1);
        }

        String inputPath = args[0];
        Path path = Paths.get(inputPath);
        File file = path.toFile();

        if (!file.exists()) {
            System.err.println("File not found: " + inputPath);
            System.exit(1);
        }

        try {
            String code = new String(Files.readAllBytes(path));
            
            // 파서 설정
            ParserConfiguration configuration = new ParserConfiguration();
            configuration.setLanguageLevel(ParserConfiguration.LanguageLevel.JAVA_17);
            JavaParser javaParser = new JavaParser(configuration);
            
            ParseResult<CompilationUnit> result = javaParser.parse(code);

            if (result.isSuccessful() && result.getResult().isPresent()) {
                CompilationUnit cu = result.getResult().get();
                
                // 전처리 없이 최상위 노드부터 전체 AST 구조 그대로 덤프
                System.out.println(traverseNode(cu, 0));

            } else {
                System.err.println("Parse error: " + result.getProblems());
                System.exit(1);
            }
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }

    private static String traverseNode(Node node, int indent) {
        StringBuilder sb = new StringBuilder();
        String indentStr = " ".repeat(indent);
        String innerIndent = " ".repeat(indent + 2);

        sb.append("{\n");
        sb.append(innerIndent).append("\"kind\": \"").append(node.getClass().getSimpleName()).append("\",\n");

        // 소스코드 데이터 (text)
        Optional<String> tokenRangeStr = node.getTokenRange().map(Object::toString);
        if (tokenRangeStr.isPresent()) {
            sb.append(innerIndent).append("\"text\": \"").append(escape(tokenRangeStr.get())).append("\",\n");
        }

        // 위치 데이터 (range)
        appendRange(sb, node.getRange(), indent + 2);

        // 자식 노드 순회
        List<Node> children = node.getChildNodes();
        if (!children.isEmpty()) {
            sb.append(",\n").append(innerIndent).append("\"children\": [\n");
            for (int i = 0; i < children.size(); i++) {
                sb.append(innerIndent).append("  ").append(traverseNode(children.get(i), indent + 4));
                if (i < children.size() - 1) {
                    sb.append(",");
                }
                sb.append("\n");
            }
            sb.append(innerIndent).append("]\n");
        } else {
            sb.append("\n");
        }

        sb.append(indentStr).append("}");
        return sb.toString();
    }

    private static void appendRange(StringBuilder sb, Optional<Range> rangeOpt, int indent) {
        String indentStr = " ".repeat(indent);
        String innerIndent = " ".repeat(indent + 2);
        
        sb.append(indentStr).append("\"range\": {\n");
        if (rangeOpt.isPresent()) {
            Range r = rangeOpt.get();
            sb.append(innerIndent).append("\"start\": { \"line\": ").append(r.begin.line)
              .append(", \"col\": ").append(r.begin.column).append(" },\n");
            sb.append(innerIndent).append("\"end\": { \"line\": ").append(r.end.line)
              .append(", \"col\": ").append(r.end.column).append(" }\n");
        } else {
            sb.append(innerIndent).append("\"start\": { \"line\": 0, \"col\": 0 },\n");
            sb.append(innerIndent).append("\"end\": { \"line\": 0, \"col\": 0 }\n");
        }
        sb.append(indentStr).append("}");
    }

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
    }
}