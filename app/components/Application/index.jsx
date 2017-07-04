import React from 'react';
import bemCl from 'bem-cl';
import FormFromSchema from 'components/FormFromSchema';


import './Application.scss';

const b = bemCl('sb-application');


class Application extends React.PureComponent {
    
    render() {
        return (
            <div>
                <nav className="navbar navbar-inverse navbar-static-top">
                    <div className="container-fluid">
                        <div className="navbar-header">
                            <a className="navbar-brand" href="#">SMDbox</a>
                        </div>
                    </div>
                </nav>
                <div className="container">
                    <CreateProject />
                    <FormFromSchema />
                </div>
            </div>
        );
    }
}

export default Application;
