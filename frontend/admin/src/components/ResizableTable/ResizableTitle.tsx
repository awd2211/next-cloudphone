/**
 * 可拖动调整宽度的表格列头组件
 *
 * 使用 react-resizable 实现列宽拖动调整
 * 配合 Ant Design Table 使用
 */
import { Resizable, ResizeCallbackData } from 'react-resizable';
import type { CSSProperties, SyntheticEvent } from 'react';
import 'react-resizable/css/styles.css';

interface ResizableTitleProps {
  onResize: (e: SyntheticEvent, data: ResizeCallbackData) => void;
  width: number;
  [key: string]: any;
}

/**
 * 可拖动调整宽度的表头单元格
 */
export const ResizableTitle = ({
  onResize,
  width,
  ...restProps
}: ResizableTitleProps) => {
  // 如果没有 width，直接返回普通 th
  if (!width) {
    return <th {...restProps} />;
  }

  return (
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          className="react-resizable-handle"
          style={{
            position: 'absolute',
            right: -5,
            bottom: 0,
            width: 10,
            height: '100%',
            cursor: 'col-resize',
            zIndex: 1,
          }}
          onClick={(e) => e.stopPropagation()}
        />
      }
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} />
    </Resizable>
  );
};

export default ResizableTitle;
