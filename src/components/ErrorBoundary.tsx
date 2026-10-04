import { Component, type ErrorInfo, type ReactNode } from 'react';
export default class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:Error,info:ErrorInfo){console.error('Tracker render failed',error,info.componentStack);}
  render(){return this.state.failed?<div className="content-empty" role="alert"><h2>The tracker could not display this view.</h2><p>A refresh will load the latest version.</p><button onClick={()=>location.reload()}>Reload tracker</button></div>:this.props.children;}
}
