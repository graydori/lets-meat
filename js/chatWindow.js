/** @jsx React.DOM */
//TODO: https://keep.google.com/
document.body.addEventListener('touchmove', function(event) {
  console.log(event.source);
  //if (event.source == document.body)
    event.preventDefault();
}, false);
 
 /*What is this for?!*/
window.onresize = function() {
  $(document.body).width(window.innerWidth).height(window.innerHeight);
}

$(function() {
  window.onresize();
});

var ref = new Firebase("https://lets-meat.firebaseio.com/");
var guysRef = ref.child("guys");
var currentUserRef;
var currentUserProfile;
var currentUserProfileData = {
          name :  "You" ,
          image : "http://americanmuslimconsumer.com/wp-content/uploads/2013/09/blank-user.jpg",
          info : { lines : ['Online, Here', '150','XX'], about : "This is your profile!"}
        };
//local cache of the data
var currentUserData = [ { 'count' : 1 } ];
var processAuthData = function (newAuthData) {
    currentUserRef = ref.child("userInter").child(newAuthData.uid);
    currentUserProfile = ref.child("userProfile").child(newAuthData.uid);
    
    currentUserProfile.on('value',function (val) {
      if (!val.exists()) {
        currentUserProfile.set(currentUserProfileData);
      } else {
        currentUserProfileData = val.val();
      }
    });
    
    //get the currenct state
    currentUserRef.on("value",function(snapshot) {
      if (!snapshot.exists()) {
        currentUserRef.set(currentUserData);
      } else {
        //data defined
        currentUserData = snapshot.val();
      }
    },function (argument) {
      //no data - some issue
    })
    console.log("Authenticated successfully with payload:", newAuthData.uid);
}
//syncronysly check if the user is logged in
var authData = ref.getAuth();
if (authData) {
  processAuthData(authData);
} else {
  //log the user in 
  ref.authAnonymously(function(anonError, anonAuthData) {
    if (anonError) {
      //show the user that w
      console.log("Login Failed!", anonError);
    } else {
      processAuthData(anonAuthData);
    }
  });
}

var GuyButton = React.createClass({
  handleClick : function (argument) {
    var self = this;
    //on select pass the details about the guy and the key
    self.props.onSelect(self.props.guy,self.props.guyIndex);
  },
  render : function () {
    var self = this;
    var badge;
    if (self.props.guyCount) {
      badge = <span className="badge">{self.props.guyCount}</span>;
    }
    var style = {};
    
    if (self.props.guy.image) {
      console.log(self.props.guy.image);
      style = {
        backgroundImage : 'url(' + self.props.guy.image + ')',
        backgroundSize : 'cover'
      };
    }
    return (<a onClick={ self.handleClick }  className='square-box'>
        <div className='square-content'>
          <div className='square-inner'>
            <span className='square-btn'>
              <em>{ self.props.guy.name }</em>
              {badge}
              <span className='square-img' style={ style } ></span>
            </span>
          </div>
        </div>
      </a>);
  }
});

var GuyList = React.createClass({
  mixins : [ReactFireMixin],
  getInitialState: function() {
    return { 
      userProfile : { name : 'You' },
      items : [ { name : 'Andrew' }],
      userItems : [ { count : 0 }]
    };
  },
  componentWillMount: function() {
    this.bindAsArray(guysRef, "items");
    this.bindAsArray(currentUserRef, "userItems")
    this.bindAsObject(currentUserProfile, "userProfile" )
  },
  render : function () {
    var self = this;
    var guys = (self.state.items||[]).map(function(item,index) {
        return <GuyButton guy={item} guyIndex={index} guyCount={self.state.userItems[index].count} key={index} onSelect={ self.props.onSelect }  />;
      });
    return (<div className="main-view"><div className="navbar navbar-inverse" role="navigation">
     <div className="container">
       <ul className="nav navbar-nav pull-right">
         <li><a href="#alert"><i className="glyphicon glyphicon-user"></i></a></li>
       </ul>
       <div className="navbar-header">
         <a className="navbar-brand" href="#">MEAT <img src="img/packed.svg" /></a>
       </div>
     </div>
   </div>
   <div className="scroll-content guys">
      <GuyButton guy={self.state.userProfile} onSelect={ self.props.onSelect }  />
      {guys}
   </div>
   </div>);
  }
});

var GuyDetails = React.createClass({
  mixins : [ReactFireMixin],
  getInitialState: function() {
    return { height : 0, scrollTop : 0 };
  },
  componentWillMount: function() {
    if ( typeof this.props.guyIndex !== 'undefined') {
      this.bindAsObject(currentUserRef.child(this.props.guyIndex), "userState");
    }
  },
  onScroll : function(arg) {
    this.setState({ scrollTop : $(arg.currentTarget).scrollTop() });
  },
  updateDimensions : function () {
    this.setState({ height : $(this.refs.scroll.getDOMNode()).height() });
  },
  changeImage : function(event) {
    //http://www.nickdesteffen.com/blog/file-uploading-over-ajax-using-html5
    var self = this;
    var files = [];
    if (!event.target.files.length) { return; }
    self.setState({ uploading : true });
    
    var reader = new FileReader();
    reader.onload = function(event) { 
      self.props.guy.image = event.target.result; 
      currentUserProfile.child('image').set(self.props.guy.image);
      self.setState({ uploading : null });
    };
    reader.readAsDataURL(event.target.files[0]);
  },
  componentDidMount: function () {
    this.updateDimensions();
    $(window).on("resize",this.updateDimensions);
    if (this.refs.image) {
      $(this.refs.image.getDOMNode()).on('change',this.changeImage);
    }
  },
  componentWillUnmount: function() {
     $(window).off("resize",this.updateDimensions);
     if (this.refs.image) {
      $(this.refs.image.getDOMNode()).off('change',this.changeImage);
    }
  },
  render : function (argument) {
    var info = this.props.guy.info.lines.map(function(item,index) {
      return (<div key={index}>{ item }</div>)
    });
    
    var opacity = 1;
    
    if (this.state.height) {
      opacity = 1 - this.state.scrollTop / this.state.height;
      if (opacity < 0) { 
        opacity = 0;
      }
    }
    
    var style =  {
      backgroundImage : 'url(' + this.props.guy.image + '),url(../img/loading.gif)',
      opacity : opacity
    };
    

    var button;
    if (this.state.userState) {
      var badge;
      if (this.state.userState && this.state.userState.count) {
        badge = <span className="badge">{this.state.userState.count}</span>;
      }
      button = (<a onClick={this.props.onChat } className="pull-right btn-lg btn btn-default">
        {badge}
        <i className="fa fa-comments-o"></i>
      </a>);
    } else {
      var buttonClassName = "pull-right btn-lg btn btn-default upload-btn";
      var iconClassName = "fa fa-camera";
      if (this.state.uploading) {
        buttonClassName += " active";
        iconClassName = "fa fa-spin fa-spinner";
      }
      button = (<a className={buttonClassName} >
        <div><i className={iconClassName} ></i> Upload a Hot Pic</div>
        <input type="file" ref="image" />
      </a>);
    }
    
    return (<div className="main-view">
      <div className="navbar navbar-inverse" role="navigation">
       <div className="container">
         <ul className="nav navbar-nav  pull-left">
           <li><a onClick={ this.props.onBack }><i className="fa fa-chevron-left"></i> Browse</a></li>
         </ul>
         <p className="text-center navbar-text">{this.props.guy.name}</p>
       </div>
     </div>
     <div className="guy-image" style={ style }></div>
     <div onScroll={ this.onScroll } ref="scroll" className="scroll-content guy-details">
        <div className="guy-details-inner">
          {button}
          <h1>{this.props.guy.name}</h1>
          <div className="box">{info}</div>
          <div className="box">
            <div className="heading">About Me</div>
            <div dangerouslySetInnerHTML={{
              __html: this.props.guy.info.about }} ></div>
          </div>
        </div>
     </div>
    </div>);
  }
});

var ChatBubble = React.createClass({
  render: function() {
    var self = this;
    var createItem = function(item, index) {
      return <div className="clearfix" key={index}><div className={ 'from-' +  item.from }  ><p>{ item.text }</p></div></div>;
    };
    return <div className="clearfix chat-messages scroll-content">{ (!self.props.items)?'':self.props.items.map(createItem) }</div>;
  }
});

var ChatOption = React.createClass({
  onSelect : function (event) {
    //todo - figure out what path we are at right now and update the state
    var self = this;
    self.props.onSelect(self.props.option,self.props.optionIndex)
  },
  render : function() {
    var self = this;
    return <li ><a onClick={ self.onSelect } >{ self.props.option.text }</a></li>;
  }
});

var ChatOptions = React.createClass({
    render : function() {
      var self = this;
      if (!self.props.options) { return false; }
      var createOptions = function (item,index) {
         return <ChatOption onSelect={ self.props.onSelect } optionIndex={index} key={index} option={item} />;
      }
      return <div className="chat-options"><ul>{ self.props.options.map(createOptions) }</ul></div>  
    }
});

var ChatWindow = React.createClass({
  mixins: [ReactFireMixin],

  getInitialState: function() {
    //TODO change this to firgure out there the user is for this guy
    /*var currentGuyRef;
    if (currentUserData[this.props.key]) {
      currentGuyRef = new Firebase(currentUserData[this.props.key]);
      //guysRef.child(this.props.key).ref()
    } else {
      
    }*/
    //this.props.guy.interaction
    //this.props.guy.interaction
    return {
        items : [],//[ { text : .result.text , from : 'them' }],
        options : []// .options
    };
  },
  componentWillMount: function() {
    //"https://lets-meat.firebaseio.com/guys/" +
    var self = this;
    var firebaseRef = currentUserRef.child(self.props.guyIndex);
    var guyItems = firebaseRef.child("items"); //new Firebase(currentUserData[this.props.key]);
    //viewing this page resets the count to 0
    firebaseRef.child("count").set(0);
    //get the options
    self.guyLocation = firebaseRef.child("loc");
    self.guyLocation.on('value',function (val) {
      // body...
      if (!val.exists()) {
        self.guyLocation.set("https://lets-meat.firebaseio.com/guys/"+self.props.guyIndex+"/interaction/options/");
      } else {
        self.guyLocationData = val.val();
        var newPositon = new Firebase(self.guyLocationData);
        newPositon.on('value',function(ops) {
            if (ops.exists()) {
              self.setState({ options : ops.val()});
            }
            newPositon.off();
        });
      }
    });
    /*
    self.guyLocation.on('child_changed',function(snap) {
      self.guyLocationData = snap;
      
    });*/
    //console.log(guyItems.val(),guyItems.exists());
    guyItems.on('value',function (val) {
      // body...
      if (!val.exists()) {
        //push the first item
        guyItems.push({ text : self.props.guy.interaction.result.text , from : 'them' });
      }
      guyItems.off();
    })
    self.bindAsArray(guyItems, "items");
  },
  componentWillUnmount: function() {
    this.guyLocation.off();
  },
  onSelect : function (item,index) {
    var self = this;
     self.firebaseRefs["items"].push({ text : item.text, from:'me' });
     //var nextItems = self.state.items.concat(;
     
     var nextOptions = self.guyLocationData + index + "/options";//  item.options;
     var nextResult = item.result;
     self.setState({ options:null});
     //after a short while update the items
     setTimeout(function() {
         if (nextResult) {
           self.firebaseRefs["items"].push({ text : nextResult.text , from: 'them' });
         }
         //var nextItems = self.state.items.concat(newItem);
         self.guyLocation.set(nextOptions);
         //self.setState({items : nextItems, options : nextOptions});
     }, 1000);
  },

  render: function() {
      var self = this;
      
    return (<div className="main-view">
      <div className="navbar navbar-inverse" role="navigation">
       <div className="container">
         <ul className="nav navbar-nav  pull-left">
           <li><a onClick={ self.props.onBack }><i className="fa fa-chevron-left"></i> Browse</a></li>
         </ul>
         <p className="text-center navbar-text">{self.props.guy.name}</p>
       </div>
     </div>
      <div className="chat-options-wrapper">
      <ChatBubble items={ self.state.items } />
      <ChatOptions options={ self.state.options} onSelect={ self.onSelect }  />
    </div></div>);
  }
});


var App = React.createClass({
  getInitialState: function() {
    return {};
  },
  backToGuy : function() {
    var self = this;
    self.setState({ chatting : null });
  },
  toGuy : function(guy,guyIndex) {
    var self = this;
    self.setState({ guy : guy , guyIndex : guyIndex, chatting : null });
  },
  toHome : function() {
    var self = this;
    self.setState({ guy : null, guyIndex : null });
  },
  toChat : function () {
    var self = this;
    self.setState({ chatting : true });
  },
  render : function (argument) {
    var self = this;
    var result;
    if (self.state.chatting && self.state.guy) {
      result = <ChatWindow onBack={ self.backToGuy } guy={ self.state.guy } guyIndex={ self.state.guyIndex } />;
    } else if (self.state.guy) {
      result = <GuyDetails onBack={ self.toHome } onChat={ self.toChat } guy={ self.state.guy } guyIndex={ self.state.guyIndex } />;
    } else {
      result = <GuyList onSelect={ self.toGuy } />;
    }
    
    return <div id="main">{result}<span id="version">v0.01</span></div>;
  }
});

var InstallMe = React.createClass({
  render : function () {
    var self = this;
    return (<div className="container">
        <div className="alert alert-info">
          <h4>Add To Home Screen</h4>
          <p>To try out this amazing new game add this page to your home screen</p>
        </div>
    </div>);
    
  }
});

var isInstallable = ("standalone" in window.navigator)
var isInstalled = window.navigator.standalone;
if (isInstallable && !isInstalled){
  React.render(<InstallMe />, document.body);
} else {
  $(document.body).toggleClass('app-installable',isInstallable)
  // My app is installed and therefore fullscreen
  React.render(<App />, document.body);
}