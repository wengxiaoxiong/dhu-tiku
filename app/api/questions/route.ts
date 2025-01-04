import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Question {
  id: number;
  type: string;
  question: string;
  options: string[];
  answer: string;
}

// 随机抽取指定数量的题目
function getRandomQuestions(questions: Question[], count: number): Question[] {
  const shuffled = questions.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export async function GET() {
  try {
    // 获取当前文件目录路径
    const currentDir = path.dirname(new URL(import.meta.url).pathname);
    
    // 读取 JSON 文件
    const singleChoiceData = await fs.readFile(
      path.join(currentDir, 'single.json'), 
      'utf-8'
    );
    const multipleChoiceData = await fs.readFile(
      path.join(currentDir, 'multiple.json'), 
      'utf-8'
    );

    // 解析 JSON 数据
    const singleChoice: Question[] = JSON.parse(singleChoiceData);
    const multipleChoice: Question[] = JSON.parse(multipleChoiceData);

    // 随机抽取20道单选题和20道多选题
    const selectedSingle = getRandomQuestions(singleChoice, 2);
    const selectedMultiple = getRandomQuestions(multipleChoice, 2);

    // 返回数据，包含分数信息
    return NextResponse.json({ 
      success: true,
      data: {
        singleChoice: {
          questions: selectedSingle,
          totalScore: 40  // 单选题总分
        },
        multipleChoice: {
          questions: selectedMultiple,
          totalScore: 60  // 多选题总分
        }
      }
    });
    
  } catch (error) {
    console.error('Error reading question files:', error);
    return NextResponse.json({
      success: false,
      message: '获取题目失败'
    }, { status: 500 });
  }
}