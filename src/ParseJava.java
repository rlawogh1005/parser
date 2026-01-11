import com.github.javaparser.JavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ParseResult;

public class ParseJava {
    public static void main(String[] args) {
        if (args.length == 0) {
            System.out.println("No file provided");
            return;
        }

        String filePath = args[0];
        try {
            java.nio.file.Path path = java.nio.file.Paths.get(filePath);
            String code = new String(java.nio.file.Files.readAllBytes(path));

            JavaParser javaParser = new JavaParser();
            ParseResult<CompilationUnit> result = javaParser.parse(code);

            System.out.println("--- JavaParser ---");
            if (result.isSuccessful() && result.getResult().isPresent()) {
                System.out.println(result.getResult().get().toString());
            } else {
                System.out.println("Parse error: " + result.getProblems());
            }
        } catch (Exception e) {
            System.out.println("Error reading file: " + e.getMessage());
        }
    }
}
