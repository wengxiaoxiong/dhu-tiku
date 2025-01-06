import json
import re

def parse_questions(input_text):
    """
    解析输入文本并提取问题及其选项和答案。
    返回包含问题详情的字典列表。
    """
    # 将文本分割为单独的问题
    questions_raw = re.split(r'\n(?=\d+\.)', input_text.strip())
    questions = []
    
    for question_text in questions_raw:
        if not question_text.strip():
            continue
            
        # 提取问题ID和主要内容
        question_match = re.match(r'(\d+)\.(.*?)(?=[A-Z]\.|\Z)', question_text, re.DOTALL)
        if not question_match:
            continue
            
        question_id = int(question_match.group(1))
        question_content = question_match.group(2).strip()
        
        # 提取答案并将括号内容替换为空
        answer_match = re.search(r'[\(（]([A-Z,]+)[\)）]', question_content)
        if answer_match:
            correct_answers = answer_match.group(1).split(',')
            # 替换括号内的答案为空，但保留括号
            question_content = re.sub(r'[\(（][A-Z,]+[\)）]', '()', question_content)
        else:
            continue
        
        # 提取选项
        options = []
        option_matches = re.finditer(r'([A-Z])\.(.*?)(?=[A-Z]\.|\Z)', question_text, re.DOTALL)
        for match in option_matches:
            option_text = match.group(2).strip()
            options.append(option_text)
            
        questions.append({
            "id": question_id,
            "type": "multiple" if len(correct_answers) > 1 else "single",
            "question": question_content,
            "options": options,
            "answer": correct_answers if len(correct_answers) > 1 else correct_answers[0]
        })
        
    return questions

def convert_to_json(questions):
    """
    将解析后的问题转换为JSON格式。
    """
    return json.dumps(questions, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    with open("single.txt", 'r', encoding='utf-8') as file:
        input_text = file.read()
    # 处理输入文本
    parsed_questions = parse_questions(input_text)
    
    # 转换为JSON
    output_json = convert_to_json(parsed_questions)
    
    # 输出JSON
    with open('single.json', 'w', encoding='utf-8') as json_file:
        json_file.write(output_json)