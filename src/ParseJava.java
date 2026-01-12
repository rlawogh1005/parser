import com.github.javaparser.JavaParser;
import com.github.javaparser.ParseResult;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.Node;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import com.github.javaparser.ast.body.MethodDeclaration;
import com.github.javaparser.ast.body.FieldDeclaration;
import com.github.javaparser.ast.body.VariableDeclarator;
import com.github.javaparser.ast.expr.NameExpr;
import com.github.javaparser.ast.expr.StringLiteralExpr;
import com.github.javaparser.ast.expr.IntegerLiteralExpr;
import com.github.javaparser.ast.type.ClassOrInterfaceType;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;

public class ParseJava {
    public static void main(String[] args) {
        if (args.length == 0) {
            System.err.println("No file provided");
            System.exit(1);
        }

        String filePath = args[0];
        try {
            String code = new String(Files.readAllBytes(Paths.get(filePath)));
            
            com.github.javaparser.ParserConfiguration configuration = new com.github.javaparser.ParserConfiguration();
            configuration.setLanguageLevel(com.github.javaparser.ParserConfiguration.LanguageLevel.JAVA_17);
            JavaParser javaParser = new JavaParser(configuration);
            
            ParseResult<CompilationUnit> result = javaParser.parse(code);

            if (result.isSuccessful() && result.getResult().isPresent()) {
                System.out.println(nodeToJson(result.getResult().get()));
            } else {
                System.err.println("Parse error: " + result.getProblems());
                System.exit(1);
            }
        } catch (Exception e) {
            System.err.println("Error reading file: " + e.getMessage());
            System.exit(1);
        }
    }

    private static String nodeToJson(Node node) {
        StringBuilder sb = new StringBuilder();
        sb.append("{");
        
        // Type
        sb.append("\"type\": \"").append(node.getClass().getSimpleName()).append("\"");

        // Label (Extract useful info for visualization)
        String label = getLabel(node);
        if (label != null) {
            sb.append(", \"label\": \"").append(escape(label)).append("\"");
        }

        // Children
        List<Node> children = node.getChildNodes();
        if (!children.isEmpty()) {
            sb.append(", \"children\": [");
            for (int i = 0; i < children.size(); i++) {
                sb.append(nodeToJson(children.get(i)));
                if (i < children.size() - 1) {
                    sb.append(", ");
                }
            }
            sb.append("]");
        }

        sb.append("}");
        return sb.toString();
    }

    private static String getLabel(Node node) {
        if (node instanceof com.github.javaparser.ast.body.TypeDeclaration) {
             return ((com.github.javaparser.ast.body.TypeDeclaration<?>) node).getNameAsString();
        } else if (node instanceof MethodDeclaration) {
            return ((MethodDeclaration) node).getNameAsString();
        } else if (node instanceof VariableDeclarator) {
            return ((VariableDeclarator) node).getNameAsString();
        } else if (node instanceof NameExpr) {
            return ((NameExpr) node).getNameAsString();
        } else if (node instanceof StringLiteralExpr) {
            return ((StringLiteralExpr) node).getValue();
        } else if (node instanceof IntegerLiteralExpr) {
            return ((IntegerLiteralExpr) node).getValue();
        } else if (node instanceof ClassOrInterfaceType) {
            return ((ClassOrInterfaceType) node).getNameAsString();
        }
        return null;
    }

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}

