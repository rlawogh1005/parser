import ast
import sys
import json

def node_to_dict(node):
    # Base structure
    result = {
        "type": type(node).__name__
    }
    
    # Specific attributes processing if needed (e.g., name, id, value)
    if isinstance(node, ast.Name):
        result["label"] = node.id
    elif isinstance(node, ast.FunctionDef):
        result["label"] = node.name
    elif isinstance(node, ast.Constant):
        result["label"] = str(node.value)
    elif isinstance(node, ast.arg):
        result["label"] = node.arg
    
    children = []
    
    # Iterate over all fields and find child nodes
    for field, value in ast.iter_fields(node):
        if isinstance(value, ast.AST):
            children.append(node_to_dict(value))
        elif isinstance(value, list):
            for item in value:
                if isinstance(item, ast.AST):
                    children.append(node_to_dict(item))
            
    if children:
        result["children"] = children
        
    return result

def parse_python(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            code = f.read()
        tree = ast.parse(code)
        
        # Convert to dict
        ast_dict = node_to_dict(tree)
        
        return json.dumps(ast_dict, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})

if __name__ == "__main__":
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        print(parse_python(file_path))
