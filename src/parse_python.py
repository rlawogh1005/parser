import ast
import sys
import json

def node_to_dict(node):
    # 1. 기본 구조 정의
    result = {
        "type": type(node).__name__
    }
    
    # 2. [추가됨] 위치 정보 추출 (Source Location)
    # 소스 코드 매핑을 위한 필수 데이터: 시작/끝 라인 및 컬럼
    if hasattr(node, 'lineno'):
        result["range"] = {
            "start": {
                "line": node.lineno,
                "col": node.col_offset
            },
            "end": {
                # Python 3.8+ 부터 end_lineno 지원. 없을 경우 시작 위치로 대체하여 안전성 확보.
                "line": getattr(node, 'end_lineno', node.lineno),
                "col": getattr(node, 'end_col_offset', node.col_offset)
            }
        }
    
    # 3. 노드별 식별자(Label) 처리
    # 시각화 시 노드를 쉽게 구분하기 위한 핵심 속성 추출
    if isinstance(node, ast.Name):
        result["label"] = node.id
    elif isinstance(node, ast.FunctionDef):
        result["label"] = node.name
    elif isinstance(node, ast.ClassDef): # ClassDef 추가: 클래스 이름도 중요 정보
        result["label"] = node.name
    elif isinstance(node, ast.Constant):
        result["label"] = str(node.value)
    elif isinstance(node, ast.arg):
        result["label"] = node.arg
    elif isinstance(node, ast.Attribute): # Attribute 추가: 객체.속성 접근 시 속성명
        result["label"] = node.attr

    # 4. 자식 노드 순회 (재귀)
    children = []
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
        ast_dict = node_to_dict(tree)
        return json.dumps(ast_dict, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})

if __name__ == "__main__":
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        print(parse_python(file_path))
    else:
        # 테스트를 위한 기본 동작 (인자가 없을 경우 현재 파일 자체를 파싱)
        print(parse_python(__file__))