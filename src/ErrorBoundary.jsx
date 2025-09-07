import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(p){ super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error){ return { error }; }
  componentDidCatch(error, info){ console.error("App crashed:", error, info); }
  render(){
    if (this.state.error){
      return (
        <div style={{padding:16,fontFamily:"sans-serif"}}>
          <h2>Something went wrong.</h2>
          <pre style={{whiteSpace:"pre-wrap"}}>{String(this.state.error)}</pre>
          <button onClick={()=>{ try{localStorage.clear();}catch{} location.reload(); }}>
            Clear cache & reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
