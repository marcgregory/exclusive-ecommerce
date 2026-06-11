import { Button } from './Button';

type StateAction = {
  label: string;
  onClick: () => void;
};

type StateViewProps = {
  title: string;
  message?: string;
  action?: StateAction;
  secondaryAction?: StateAction;
};

export function LoadingState({
  title = 'Loading',
  message = 'Please wait while we get everything ready.',
}: Partial<StateViewProps>) {
  return (
    <div className="state-view" role="status" aria-live="polite">
      <div className="state-spinner" aria-hidden="true" />
      <h1>{title}</h1>
      <p>{message}</p>
    </div>
  );
}

export function ErrorState({
  title,
  message = 'Something went wrong.',
  action,
  secondaryAction,
}: StateViewProps) {
  return (
    <div className="state-view state-view--error" role="alert">
      <h1>{title}</h1>
      <p>{message}</p>
      <div className="state-actions">
        {action && <Button onClick={action.onClick}>{action.label}</Button>}
        {secondaryAction && (
          <Button variant="ghost" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ title, message, action, secondaryAction }: StateViewProps) {
  return (
    <div className="state-view">
      <h1>{title}</h1>
      {message && <p>{message}</p>}
      <div className="state-actions">
        {action && <Button onClick={action.onClick}>{action.label}</Button>}
        {secondaryAction && (
          <Button variant="ghost" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}
