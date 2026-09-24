import {
  Boxes,
  Flashlight,
  LampDesk,
  Ruler,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

import type { ToolId } from '../../cases/schema'

export type InvestigationTool = {
  id: ToolId
  shortcut: string
  name: string
  description: string
  Icon: LucideIcon
}

export const investigationTools: InvestigationTool[] = [
  {
    id: 'white-light',
    shortcut: '1',
    name: '白光',
    description: '均匀照明，检查整体形态与表面颜色。',
    Icon: LampDesk,
  },
  {
    id: 'side-light',
    shortcut: '2',
    name: '侧光',
    description: '低角度照明，放大划痕、凹陷和浮尘起伏。',
    Icon: Flashlight,
  },
  {
    id: 'ultraviolet',
    shortcut: '3',
    name: '紫外',
    description: '筛查擦除痕迹、体液与荧光残留。',
    Icon: Sparkles,
  },
  {
    id: 'wireframe',
    shortcut: '4',
    name: '线框',
    description: '显示扫描网格结构，识别遮挡与异常几何。',
    Icon: Boxes,
  },
  {
    id: 'measurement',
    shortcut: '5',
    name: '测量',
    description: '读取物证尺度与关键结构间距。',
    Icon: Ruler,
  },
]
