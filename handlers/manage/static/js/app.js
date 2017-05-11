'use strict';

window.ee = new EventEmitter();

var SwitchMode = React.createClass({
	getInitialState: function() {
		return {
			mode: this.props.mode
		}
	},
	componentWillReceiveProps: function(nextProps) {
		if(nextProps.mode != this.props.mode) {
			this.setState({
				mode: nextProps.mode
			});
		}
	},
	onSelect: function(e) {
		var curMode = e.target.value;
		if(this.state.mode == curMode) {
			return;
		}

		this.setState({
			mode: curMode
		});
		window.ee.emit('changeMode', {mode: curMode});
	},
	render: function() {
		return (
			<div className="panel panel-primary">
				<div className="panel-body">
					<div className="btn-group pull-right" data-toggle="buttons">
						<label
							className={'btn btn-primary ' + (this.state.mode == 'PROXY' ? 'active' : '')}>
							<input type="radio" name="options" value="PROXY"
							       onChange={this.onSelect}/>
							PROXY
						</label>
						<label
							className={'btn btn-primary ' + (this.state.mode == 'CAPTURE' ? 'active' : '')}>
							<input type="radio" name="options" value="CAPTURE"
							       onChange={this.onSelect}/>
							CAPTURE
						</label>
					</div>
				</div>
			</div>
		);
	}
});

var UploadForm = React.createClass({
	getInitialState: function() {
		return {
			noFileUpload: true
		}
	},
	onSelectFile: function(e) {
		var file = e.target.files[0];
		if(!file) {
			return;
		}

		this.setState({
			file: file,
			noFileUpload: false
		});
	},
	onUpload: function(e) {
		e.preventDefault();

		var domFile = ReactDOM.findDOMNode(this.refs.file);
		domFile.value = '';

		ee.emit('uploadRules', this.state.file);

		this.setState({
			noFileUpload: true
		});
	},
	render: function() {
		return (
			<form className="panel panel-primary">
				<div className="panel-heading">
					<h4 className="panel-title">Upload config</h4>
				</div>
				<div className="panel-body">
					<div className="form-group">
						<input onChange={this.onSelectFile} ref="file" type="file" accept=".json"
						       className="form-control"/>
					</div>
					<button onClick={this.onUpload} disabled={this.state.noFileUpload}
					        className="btn btn-success pull-right">Upload
					</button>
				</div>
			</form>
		);
	}
});

var RuleElement = React.createClass({
	onRemove: function(e) {
		window.ee.emit('removeRule', this.props.rule.id);
	},
	onEdit: function(e) {
		this.props.onEditRule(this.props.rule);
	},
	render: function() {
		function prettyStr(str, length) {
			if(str.length <= length) {
				return str;
			}

			var subStr = str.substr(0, length - 1);
			subStr += '...';
			return subStr;
		}

		var rule = this.props.rule;
		var index = this.props.index;
		return (
			<tr>
				<td>{index}</td>
				<td>{rule.method}</td>
				<td>{rule.path}</td>
				<td>{rule.statusCode}</td>
				<td>{prettyStr(rule.response, 50)}</td>
				<td>
					<button onClick={this.onRemove} className="btn btn-danger">Remove</button>
					<button onClick={this.onEdit} className="btn btn-warning">Edit</button>
				</td>
			</tr>
		);
	}
});

var RulesList = React.createClass({
	onRefresh: function() {
		window.ee.emit('refreshRules');
	},
	render: function() {
		var rulesElements = this.props.rules.map(function(rule, index) {
			return (
				<RuleElement rule={rule}
				             index={index+1}
				             onEditRule={this.props.onEditRule}/>
			);
		});

		return (
			<div className="panel panel-primary">
				<div className="panel-heading">
					<div className="panel-title">
						<h4>Rules list
							<small>
								<button onClick={this.onRefresh}
								        className="btn btn-success pull-right">
									Refresh
								</button>
							</small>
						</h4>
					</div>
				</div>
				<div className="panel-body">
					<table className="table table-striped">
						<thead>
						<tr>
							<th>#</th>
							<th>Method</th>
							<th>Path</th>
							<th>StatusCode</th>
							<th>Body</th>
							<th>Action</th>
						</tr>
						</thead>
						<tbody>{rulesElements}</tbody>
					</table>
				</div>
			</div>
		);
	}
});

var RuleForm = React.createClass({
	getInitialState: function() {
		return {
			pathIsEmpty: true,
			statusCodeIsEmpty: true,
			headerError: false
		};
	},
	onMethodChange: function(e) {
		this.props.onFieldChange('method', e.target.value);
	},
	onPathChange: function(e) {
		var value = e.target.value.trim();
		var isCorrectVal = value.length > 0;

		this.props.onFieldChange('path', value);
		this.setState({
			pathIsEmpty: !isCorrectVal
		});
	},
	onStatusCodeChange: function(e) {
		var isCorrectVal = /^\d{3}$/.test(e.target.value);

		this.props.onFieldChange('statusCode', e.target.value);
		this.setState({
			statusCodeIsEmpty: !isCorrectVal
		});
	},
	onResponseChange: function(e) {
		this.props.onFieldChange('response', e.target.value);
		this.setState({
			response: e.target.value
		});
	},
	onHeaderChange: function(index, name, value) {
		var headers = _.cloneDeep(this.state.headers);
		var headerError = _.some(headers, function(header, i) {
			return header.name == name && index != i;
		});
		var error = headerError || _.some(headers, function(header, i) {
				return header.error && index != i;
			});

		headers[index] = {name: name, value: value, error: headerError};
		this.setState({headers: headers, headerError: error});
	},
	onHeaderRemove: function(index) {
		var headers = _.cloneDeep(this.state.headers);
		headers.splice(index, 1);
		this.setState({headers: headers});
	},
	onHeaderAdd: function() {
		this.setState({
			headers: this.state.headers.concat([{name: '', value: ''}])
		});
	},
	onAddRule: function(e) {
		e.preventDefault();

		var headers = _.reduce(this.state.headers, function(obj, item) {
			if(!_.trim(item.name) || !_.trim(item.value)) {
				return obj;
			}

			obj[item.name] = item.value;
			return obj;
		}, {});

		var rule = {
			data: {
				method: this.state.method,
				path: _.trim(this.state.path),
				headers: headers,
				statusCode: this.state.statusCode,
				response: this.state.response
			}
		};

		this.setState({
			method: 'GET',
			path: '',
			statusCode: '',
			response: '',
			headers: [{name: '', value: ''}],
			pathIsEmpty: true,
			statusCodeIsEmpty: true,
			headerError: false
		});

		window.ee.emit('addRule', rule);
	},
	render: function() {
		return (
			<form className="panel panel-primary">
				<div className="panel-heading">
					<h4 className="panel-title">Add rule</h4>
				</div>
				<div className="panel-body">
					<div className="form-group">
						<label>Method</label>
						<select onChange={this.onMethodChange} value={this.props.method}
						        ref="method"
						        className="form-control">
							<option>GET</option>
							<option>POST</option>
						</select>
					</div>
					<div className="form-group">
						<label>Path</label>
						<input onChange={this.onPathChange} value={this.props.path} ref="path"
						       className="form-control"/>
					</div>
					<div className="form-group">
						<label>Status Code</label>
						<input onChange={this.onStatusCodeChange} value={this.props.statusCode}
						       ref="statusCode"
						       className="form-control"/>
					</div>
					{/* <HeadersList onHeaderChange={this.onHeaderChange}
					             onHeaderAdd={this.onHeaderAdd}
					             onHeaderRemove={this.onHeaderRemove}
					             headers={this.props.headers}/> */}
					<div className="form-group">
						<label>Response Body</label>
						<textarea onChange={this.onResponseChange} value={this.props.response}
						          className="form-control vresize" rows="5"/>
					</div>
					<button
						disabled={this.state.pathIsEmpty || this.state.statusCodeIsEmpty || this.state.headerError}
						onClick={this.onAddRule}
						className="btn btn-success pull-right">
						Add
					</button>
				</div>
			</form>
		);
	}
});

var HeaderElement = React.createClass({
	onNameChange: function(e) {
		this.props.onHeaderChange(this.props.index, e.target.value, this.props.header.value);
	},
	onValueChange: function(e) {
		this.props.onHeaderChange(this.props.index, this.props.header.name, e.target.value);
	},
	onRemove: function(e) {
		this.props.onHeaderRemove(this.props.index);
	},
	render: function() {
		var self = this;

		function getAddButton(flag) {
			if(!flag) {
				return;
			}

			return (
				<div className="form-group">
					<button onClick={self.props.onHeaderAdd}
					        className="btn btn-success"
					        type="button">
						Add
					</button>
				</div>
			);
		}

		return (
			<div className="form-inline">
				<div className={'form-group ' + (this.props.header.error ? 'has-error': '')}>
					<input onChange={this.onNameChange} value={this.props.header.name}
					       className="form-control" placeholder="Name"/>
				</div>
				<div className="form-group">
					<input onChange={this.onValueChange} value={this.props.header.value}
					       className="form-control" placeholder="Value"/>
				</div>
				<div className="form-group">
					<button onClick={this.onRemove}
					        disabled={this.props.disableRemoveButton}
					        type="button"
					        className="btn btn-danger">
						Remove
					</button>
				</div>
				{getAddButton(this.props.needAddButton)}
			</div>
		);
	}
});

var HeadersList = React.createClass({
	onHeaderChange: function(index, name, value) {
		this.props.onHeaderChange(index, name, value);
	},
	render: function() {
		var self = this;
		var headerList = this.props.headers.map(function(header, index) {
			return (
				<HeaderElement onHeaderChange={self.onHeaderChange}
				               onHeaderRemove={self.props.onHeaderRemove}
				               onHeaderAdd={self.props.onHeaderAdd}
				               disableRemoveButton={self.props.headers.length == 1}
				               needAddButton={index==self.props.headers.length - 1}
				               header={header}
				               index={index}/>
			);
		});

		return (
			<div className="form-group">
				<label>Headers</label>
				{headerList}
			</div>
		);
	}
});

var App = React.createClass({
	getInitialState: function() {
		return {
			rules: [],
			ruleForm: {
				headers: [{name: '', value: ''}],
				method: 'GET',
				path: '',
				statusCode: '',
				response: ''
			}
		};
	},
	onRuleFormChange: function(fieldName, value) {
		var newState = _.assign({}, this.state.ruleForm, {[fieldName]: value});
		this.setState(newState);
	},
	onEditRule: function(rule) {
		var rules = _.filter(this.state.rules, function(item) {
			return item.id != rule.id;
		});

		this.setState({
			rules: rules,
			ruleForm: rule
		});
	},
	componentDidMount: function() {
		var self = this;
		this.onRuleFormChange = this.onRuleFormChange.bind(this);
		this.onEditRule = this.onEditRule.bind(this);

		window.ee.on('uploadRules', function(file) {
			fetch('/api/upload', {
				method: 'POST',
				body: file
			})
				.then(function(response) {
					return response.json();
				})
				.then(function(config) {
					self.setState({
						title: config.title,
						mode: config.mode,
						rules: config.rules,
						ruleForm: {
							headers: [{name: '', value: ''}],
							method: 'GET',
							path: '',
							statusCode: '',
							response: ''
						}
					});
				})
				.catch(function(err) {
					console.log(err);
				});
		});
		window.ee.on('addRule', function(rule) {
			fetch('/api/rules', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(rule)
			})
				.then(function(response) {
					return response.json();
				})
				.then(function(rule) {
					self.setState({
						rules: [rule].concat(self.state.rules)
					});
				})
				.catch(function(err) {
					console.log(err);
				});
		});
		window.ee.on('removeRule', function(id) {
			fetch('/api/rules/' + id, {
				method: 'DELETE'
			})
				.then(function() {
					var rules = _.filter(self.state.rules, function(rule) {
						return rule.id != id;
					});

					var currentRule = _.find(self.state.rules, function(rule) {
						return rule.id == id;
					});

					self.setState({
						rules: rules,
						currentRule: currentRule
					});
				})
				.catch(function(err) {
					console.log(err);
				});
		});
		window.ee.on('changeMode', function(mode) {
			fetch('/api/rules/mode', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(mode)
			})
				.then(function() {
					return getConfig();
				})
				.catch(function(err) {
					console.log(err);
				});
		});
		window.ee.on('refreshRules', function() {
			getConfig();
		});
		getConfig();

		function getConfig() {
			return fetch('/api/rules')
				.then(function(response) {
					return response.json();
				})
				.then(function(config) {
					self.setState({
						title: config.title,
						mode: config.mode,
						rules: config.rules,
						ruleForm: {
							headers: [{name: '', value: ''}],
							method: 'GET',
							path: '',
							statusCode: '',
							response: ''
						}
					});
				})
				.catch(function(err) {
					console.log(err);
				});
		}
	},
	render: function() {
		return (
			<div>
				<h3>Proxy Server
					<small className="pull-right">
						<a href="/api/download">download config</a>
					</small>
				</h3>

				<SwitchMode mode={this.state.mode}/>
				<UploadForm />
				<RuleForm rule={this.state.ruleForm} onFieldChange={this.onRuleFormChange}/>
				<RulesList rules={this.state.rules} onEditRule={this.onEditRule}/>
			</div>
		);
	}
});

ReactDOM.render(<App />, document.getElementById('root'));
