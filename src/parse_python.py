import ast
import sys
import json
import os

def node_to_dict(node, source_code):
    """
    재귀적으로 AST 노드를 순회하며 모든 정보를 딕셔너리로 변환
    """
    # 1. 노드 타입
    node_type = type(node).__name__
    
    # 2. 위치 정보 및 텍스트 추출
    # ast.get_source_segment는 Python 3.8+ 에서 지원
    # 해당 노드가 소스코드에서 차지하는 정확한 텍스트를 가져옵니다.
    text_segment = ""
    start_line, start_col = 0, 0
    end_line, end_col = 0, 0

    if hasattr(node, 'lineno'):
        start_line = node.lineno
        start_col = node.col_offset
        # end_lineno와 end_col_offset은 Python 3.8+ 부터 지원
        end_line = getattr(node, 'end_lineno', start_line)
        end_col = getattr(node, 'end_col_offset', start_col)
        
        try:
            text_segment = ast.get_source_segment(source_code, node)
        except Exception:
            text_segment = ""

    result = {
        "type": node_type,
        "text": text_segment if text_segment else "",
        "range": {
            "start": {"line": start_line, "col": start_col},
            "end": {"line": end_line, "col": end_col}
        }
    }
    
    # 3. 디버깅/식별을 위한 주요 속성 추가 (이름, ID, 값 등)
    # 텍스트만으로는 식별이 어려울 수 있으므로 주요 속성을 별도로 추출
    attributes = {}
    for key in ['name', 'id', 'arg', 'module', 'level']:
        if hasattr(node, key):
            attributes[key] = getattr(node, key)
    # 상수 값(Constant) 처리
    if isinstance(node, ast.Constant):
        attributes['value'] = str(node.value)
        
    if attributes:
        result["attributes"] = attributes

    # 4. 자식 노드 순회 (모든 필드 탐색)
    children = []
    for field, value in ast.iter_fields(node):
        if isinstance(value, ast.AST):
            # 단일 자식 노드
            children.append(node_to_dict(value, source_code))
        elif isinstance(value, list):
            # 리스트 형태의 자식 노드들 (예: body)
            for item in value:
                if isinstance(item, ast.AST):
                    children.append(node_to_dict(item, source_code))
            
    if children:
        result["children"] = children
        
    return result

def parse_python(file_path):
    try:
        abs_path = os.path.abspath(file_path)
        dir_name = os.path.dirname(abs_path)
        base_name = os.path.basename(abs_path)
        
        with open(abs_path, 'r', encoding='utf-8') as f:
            code = f.read()
            
        tree = ast.parse(code)
        
        # AST 변환 (Module 노드 자체도 포함하여 계층 구조 시작)
        # 보통 tree는 Module 타입입니다.
        ast_result = node_to_dict(tree, code)
        
        # Module 노드의 자식들(실제 코드 내용)을 File의 children으로 설정할지,
        # 아니면 Module 자체를 포함할지 결정. 여기서는 깔끔하게 Module의 자식들을 사용.
        file_children = ast_result.get("children", [])
        
        # File 노드 생성
        file_node = {
            "type": "file",
            "name": base_name,
            "range": {
                "start": {"line": 1, "col": 0},
                "end": {"line": len(code.splitlines()), "col": 0}
            },
            "children": file_children
        }

        # Directory 노드 생성 (Root)
        root_node = {
            "type": "directory",
            "name": os.path.basename(dir_name) if dir_name else ".",
            "range": file_node["range"],
            "children": [file_node]
        }
        
        return json.dumps([root_node], indent=4, ensure_ascii=False)
        
    except Exception as e:
        return json.dumps({"error": str(e)})

if __name__ == "__main__":
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        print(parse_python(file_path))
    else:
        # 테스트용: 현재 파일 자신을 파싱
        print(parse_python(__file__))