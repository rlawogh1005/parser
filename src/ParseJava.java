import com.github.javaparser.JavaParser;
import com.github.javaparser.ParseResult;
import com.github.javaparser.ParserConfiguration;
import com.github.javaparser.Range;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.Node;
import com.github.javaparser.ast.body.*;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

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
                
                StringBuilder sb = new StringBuilder();
                sb.append("[\n");
                
                // 1. Directory 노드
                sb.append("    {\n");
                sb.append("        \"type\": \"directory\",\n");
                sb.append("        \"name\": \"").append(escape(file.getParent() == null ? "." : file.getParent())).append("\",\n");
                appendRange(sb, cu.getRange(), 8);
                sb.append(",\n");
                sb.append("        \"children\": [\n");

                // 2. File 노드
                sb.append("            {\n");
                sb.append("                \"type\": \"file\",\n");
                sb.append("                \"name\": \"").append(escape(file.getName())).append("\",\n");
                appendRange(sb, cu.getRange(), 16);
                sb.append(",\n");
                sb.append("                \"children\": ");
                
                // 3. AST 내부 순회
                sb.append(processChildren(cu, 20));
                
                sb.append("\n            }\n");
                sb.append("        ]\n");
                sb.append("    }\n");
                sb.append("]");

                System.out.println(sb.toString());

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

    private static String processChildren(Node node, int indent) {
        List<Node> targetChildren = node.getChildNodes().stream()
                .filter(ParseJava::isTargetNode)
                .collect(Collectors.toList());

        if (targetChildren.isEmpty()) {
            return "[]";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("[\n");
        
        String indentStr = " ".repeat(indent);
        String innerIndent = " ".repeat(indent + 4);

        for (int i = 0; i < targetChildren.size(); i++) {
            Node child = targetChildren.get(i);
            sb.append(indentStr).append("{\n");
            
            sb.append(innerIndent).append("\"type\": \"").append(getNodeType(child)).append("\",\n");
            sb.append(innerIndent).append("\"name\": \"").append(escape(getNodeName(child))).append("\",\n");
            
            appendRange(sb, child.getRange(), indent + 4);
            
            sb.append(",\n").append(innerIndent).append("\"children\": ");
            sb.append(processChildren(child, indent + 8));
            
            sb.append("\n").append(indentStr).append("}");
            
            if (i < targetChildren.size() - 1) {
                sb.append(",\n");
            }
        }
        sb.append("\n").append(" ".repeat(indent - 4)).append("]");
        return sb.toString();
    }

    private static void appendRange(StringBuilder sb, Optional<Range> rangeOpt, int indent) {
        String indentStr = " ".repeat(indent);
        String innerIndent = " ".repeat(indent + 4);
        
        sb.append(indentStr).append("\"range\": {\n");
        if (rangeOpt.isPresent()) {
            Range r = rangeOpt.get();
            sb.append(innerIndent).append("\"start\": {\n");
            sb.append(innerIndent).append("    \"line\": ").append(r.begin.line).append(",\n");
            sb.append(innerIndent).append("    \"col\": ").append(r.begin.column).append("\n");
            sb.append(innerIndent).append("},\n");
            sb.append(innerIndent).append("\"end\": {\n");
            sb.append(innerIndent).append("    \"line\": ").append(r.end.line).append(",\n");
            sb.append(innerIndent).append("    \"col\": ").append(r.end.column).append("\n");
            sb.append(innerIndent).append("}\n");
        } else {
            sb.append(innerIndent).append("\"start\": { \"line\": 0, \"col\": 0 },\n");
            sb.append(innerIndent).append("\"end\": { \"line\": 0, \"col\": 0 }\n");
        }
        sb.append(indentStr).append("}");
    }

    private static boolean isTargetNode(Node node) {
        return node instanceof TypeDeclaration || 
               node instanceof MethodDeclaration || 
               node instanceof ConstructorDeclaration;
    }

    // [수정됨] Switch Pattern Matching -> if-else instanceof 변경
    private static String getNodeType(Node node) {
        if (node instanceof ClassOrInterfaceDeclaration) {
            return ((ClassOrInterfaceDeclaration) node).isInterface() ? "interface" : "class";
        }
        if (node instanceof EnumDeclaration) return "enum";
        if (node instanceof RecordDeclaration) return "record";
        if (node instanceof MethodDeclaration) return "method";
        if (node instanceof ConstructorDeclaration) return "constructor";
        return "unknown";
    }

    // [수정됨] Switch Pattern Matching -> if-else instanceof 변경
    private static String getNodeName(Node node) {
        if (node instanceof TypeDeclaration) {
            return ((TypeDeclaration<?>) node).getNameAsString();
        }
        if (node instanceof MethodDeclaration) {
            return ((MethodDeclaration) node).getNameAsString();
        }
        if (node instanceof ConstructorDeclaration) {
            return ((ConstructorDeclaration) node).getNameAsString();
        }
        return "-";
    }

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}