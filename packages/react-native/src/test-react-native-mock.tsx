import React from 'react';

export const Text = ({ children, testID }: { children?: React.ReactNode; testID?: string }) => (
  <span data-testid={testID}>{children}</span>
);

export const Button = ({
  title,
  onPress,
  testID,
}: {
  title: string;
  onPress?: () => void;
  testID?: string;
}) => (
  <button data-testid={testID} onClick={onPress}>
    {title}
  </button>
);

export const View = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;

export default { Text, Button, View };
