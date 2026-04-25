import React from 'react';
import MobileTaskDetail from '../pages/MobileTaskDetail';
import TaskBrowser from '../pages/TaskBrowser';
import { useIsMobile } from '../hooks/useIsMobile';

const TaskViewer = (props) => {
  const isMobile = useIsMobile();
  return isMobile ? <MobileTaskDetail {...props} /> : <TaskBrowser {...props} />;
};

export default TaskViewer;
