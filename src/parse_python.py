import ast
import sys
import os

def parse_python(file_path):
    try:
        abs_path = os.path.abspath(file_path)
        
        with open(abs_path, 'r', encoding='utf-8') as f:
            code = f.read()
            
        tree = ast.parse(code)
        
        # ast.dump() 에 indent 옵션은 Python 3.9 이상에서만 지원됩니다.
        try:
            return ast.dump(tree, indent=4)
        except TypeError:
            return ast.dump(tree)
            
    except Exception as e:
        return str(e)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        print(parse_python(file_path))
    else:
        # 테스트용: 샘플 파일 파싱
        print(parse_python("../samples/sample.py"))