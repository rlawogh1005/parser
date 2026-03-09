import com.github.javaparser.JavaParser;
import com.github.javaparser.ParserConfiguration;
import com.github.javaparser.printer.YamlPrinter;
public class test_jp {
    public static void main(String[] args) {
        ParserConfiguration config = new ParserConfiguration();
        JavaParser javaParser = new JavaParser(config);
        javaParser.parse("class A {}").getResult().ifPresent(cu -> {
            try {
                Class<?> clazz = Class.forName("com.github.javaparser.printer.JsonPrinter");
                Object printer = clazz.getDeclaredConstructor(boolean.class).newInstance(true);
                System.out.println(clazz.getMethod("output", com.github.javaparser.ast.Node.class).invoke(printer, cu));
            } catch (Exception e) {
                System.out.println("No JsonPrinter, falling back to Yaml");
                System.out.println(new YamlPrinter(true).output(cu));
            }
        });
    }
}
